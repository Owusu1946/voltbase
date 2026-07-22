import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { REALTIME_EVENTS, PROJECT_KEY_ROLES } from '@voltbase/constants';
import type {
  RealtimeBroadcastMessage,
  RealtimeCdcEventFilter,
  RealtimeEvent,
  RealtimePresenceState,
  RealtimePresenceTrackPayload,
  RealtimeSubscribePayload,
} from '@voltbase/types';
import type { ProjectKeyPayload } from '../project-api/project-key.guard';
import type { RealtimeSocket } from './realtime-socket.types';

type CdcSubscription = {
  event: RealtimeCdcEventFilter;
  filter?: Record<string, string>;
};

type SocketCallbackEntry = {
  projectId: string;
  tableName: string;
  callback: (event: RealtimeEvent) => void;
  subscriptions: CdcSubscription[];
};

function parseSubscribePayload(
  body: string | RealtimeSubscribePayload,
): RealtimeSubscribePayload | null {
  if (typeof body === 'string') {
    const table = body.trim();
    return table ? { table } : null;
  }
  if (
    body &&
    typeof body === 'object' &&
    typeof body.table === 'string' &&
    body.table.trim()
  ) {
    return {
      table: body.table.trim(),
      event: body.event ?? '*',
      filter: body.filter,
    };
  }
  return null;
}

function rowMatchesFilter(
  row: Record<string, unknown> | undefined,
  filter: Record<string, string>,
): boolean {
  if (!row) return false;
  for (const [key, expected] of Object.entries(filter)) {
    const actual = row[key];
    if (actual == null || String(actual) !== expected) return false;
  }
  return true;
}

function matchesCdcSubscription(
  event: RealtimeEvent,
  sub: CdcSubscription,
): boolean {
  if (sub.event && sub.event !== '*' && event.type !== sub.event) {
    return false;
  }
  if (!sub.filter || Object.keys(sub.filter).length === 0) return true;

  // INSERT/UPDATE match new row; DELETE matches old row
  if (event.type === 'DELETE') {
    return rowMatchesFilter(event.oldRecord ?? event.record, sub.filter);
  }
  return rowMatchesFilter(event.record, sub.filter);
}

function presenceRoom(projectId: string, topic: string): string {
  return `presence:${projectId}:${topic}`;
}

function broadcastRoom(projectId: string, topic: string): string {
  return `broadcast:${projectId}:${topic}`;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (process.env.WEB_URL ?? 'http://localhost:3001').replace(/\/$/, ''),
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private socketCallbacks = new Map<string, SocketCallbackEntry[]>();

  /**
   * In-memory presence — single-instance only (does not sync across replicas).
   * Key: presence room name → socketId → state
   */
  private presenceByRoom = new Map<string, Map<string, Record<string, unknown>>>();

  private socketPresenceTopics = new Map<string, Set<string>>();

  private socketBroadcastTopics = new Map<string, Set<string>>();

  constructor(
    private realtimeService: RealtimeService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: RealtimeSocket) {
    const token = client.handshake.auth['token'] as string | undefined;

    if (!token) {
      client.emit(REALTIME_EVENTS.ERROR, 'Missing API key');
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<ProjectKeyPayload>(token, {
        secret: this.configService.get<string>('PROJECT_JWT_SECRET'),
      });

      if (
        payload.role !== PROJECT_KEY_ROLES.ANON &&
        payload.role !== PROJECT_KEY_ROLES.SERVICE_ROLE
      ) {
        throw new Error('Invalid key role');
      }

      client.data.projectId = payload.projectId;
      client.data.role = payload.role;
      await client.join(`project:${payload.projectId}`);
    } catch {
      client.emit(REALTIME_EVENTS.ERROR, 'Invalid API key');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const callbacks = this.socketCallbacks.get(client.id) ?? [];
    for (const { projectId, tableName, callback } of callbacks) {
      this.realtimeService.unsubscribe(projectId, tableName, callback);
    }
    this.socketCallbacks.delete(client.id);

    const presenceTopics = this.socketPresenceTopics.get(client.id);
    if (presenceTopics) {
      for (const topic of presenceTopics) {
        this.removePresence(client as RealtimeSocket, topic);
      }
      this.socketPresenceTopics.delete(client.id);
    }

    this.socketBroadcastTopics.delete(client.id);
  }

  @SubscribeMessage(REALTIME_EVENTS.SUBSCRIBE)
  async handleSubscribe(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() body: string | RealtimeSubscribePayload,
  ) {
    const projectId = client.data.projectId;
    const parsed = parseSubscribePayload(body);
    if (!projectId || !parsed) return;

    const normalizedTable = parsed.table;
    const room = `project:${projectId}:table:${normalizedTable}`;
    const sub: CdcSubscription = {
      event: parsed.event ?? '*',
      filter: parsed.filter,
    };

    const existing = this.socketCallbacks.get(client.id) ?? [];
    const entry = existing.find(
      (e) => e.projectId === projectId && e.tableName === normalizedTable,
    );

    if (entry) {
      const duplicate = entry.subscriptions.some(
        (s) =>
          s.event === sub.event &&
          JSON.stringify(s.filter ?? {}) === JSON.stringify(sub.filter ?? {}),
      );
      if (!duplicate) {
        entry.subscriptions.push(sub);
      }
      return;
    }

    await client.join(room);

    const callback = (event: RealtimeEvent) => {
      const current = this.socketCallbacks
        .get(client.id)
        ?.find(
          (e) => e.projectId === projectId && e.tableName === normalizedTable,
        );
      if (!current) return;
      if (!current.subscriptions.some((s) => matchesCdcSubscription(event, s))) {
        return;
      }
      client.emit(REALTIME_EVENTS.EVENT, event);
    };

    await this.realtimeService.subscribe(projectId, normalizedTable, callback);

    existing.push({
      projectId,
      tableName: normalizedTable,
      callback,
      subscriptions: [sub],
    });
    this.socketCallbacks.set(client.id, existing);
  }

  @SubscribeMessage(REALTIME_EVENTS.UNSUBSCRIBE)
  async handleUnsubscribe(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() body: string | RealtimeSubscribePayload,
  ) {
    const projectId = client.data.projectId;
    const parsed = parseSubscribePayload(body);
    if (!projectId || !parsed) return;

    const normalizedTable = parsed.table;
    const room = `project:${projectId}:table:${normalizedTable}`;
    await client.leave(room);

    const callbacks = this.socketCallbacks.get(client.id) ?? [];
    const entry = callbacks.find(
      (c) => c.projectId === projectId && c.tableName === normalizedTable,
    );

    if (entry) {
      this.realtimeService.unsubscribe(
        projectId,
        normalizedTable,
        entry.callback,
      );
      this.socketCallbacks.set(
        client.id,
        callbacks.filter((c) => c !== entry),
      );
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.CHANNEL_SUBSCRIBE)
  async handleChannelSubscribe(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() body: { topic?: string },
  ) {
    const projectId = client.data.projectId;
    const topic = body?.topic?.trim();
    if (!projectId || !topic) return;

    await client.join(presenceRoom(projectId, topic));
    await client.join(broadcastRoom(projectId, topic));

    const broadcastTopics =
      this.socketBroadcastTopics.get(client.id) ?? new Set();
    broadcastTopics.add(topic);
    this.socketBroadcastTopics.set(client.id, broadcastTopics);

    // Send current presence snapshot when joining a channel
    const room = presenceRoom(projectId, topic);
    const state = this.presenceSnapshot(room);
    client.emit(REALTIME_EVENTS.PRESENCE_SYNC, { topic, state });
  }

  @SubscribeMessage(REALTIME_EVENTS.CHANNEL_UNSUBSCRIBE)
  async handleChannelUnsubscribe(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() body: { topic?: string },
  ) {
    const projectId = client.data.projectId;
    const topic = body?.topic?.trim();
    if (!projectId || !topic) return;

    this.removePresence(client, topic);

    await client.leave(presenceRoom(projectId, topic));
    await client.leave(broadcastRoom(projectId, topic));

    const broadcastTopics = this.socketBroadcastTopics.get(client.id);
    broadcastTopics?.delete(topic);
  }

  @SubscribeMessage(REALTIME_EVENTS.PRESENCE_TRACK)
  async handlePresenceTrack(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() body: RealtimePresenceTrackPayload,
  ) {
    const projectId = client.data.projectId;
    const topic = body?.topic?.trim();
    if (!projectId || !topic) return;

    const room = presenceRoom(projectId, topic);
    await client.join(room);

    const payload =
      body.payload && typeof body.payload === 'object' ? body.payload : {};

    let roomMap = this.presenceByRoom.get(room);
    if (!roomMap) {
      roomMap = new Map();
      this.presenceByRoom.set(room, roomMap);
    }

    const isNew = !roomMap.has(client.id);
    roomMap.set(client.id, payload);

    const topics = this.socketPresenceTopics.get(client.id) ?? new Set();
    topics.add(topic);
    this.socketPresenceTopics.set(client.id, topics);

    if (isNew) {
      client.to(room).emit(REALTIME_EVENTS.PRESENCE_JOIN, {
        topic,
        key: client.id,
        payload,
      });
    }

    client.emit(REALTIME_EVENTS.PRESENCE_SYNC, {
      topic,
      state: this.presenceSnapshot(room),
    });
  }

  @SubscribeMessage(REALTIME_EVENTS.PRESENCE_UNTRACK)
  handlePresenceUntrack(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() body: { topic?: string },
  ) {
    const topic = body?.topic?.trim();
    if (!topic) return;
    this.removePresence(client, topic);
  }

  @SubscribeMessage(REALTIME_EVENTS.BROADCAST)
  async handleBroadcast(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() body: RealtimeBroadcastMessage,
  ) {
    const projectId = client.data.projectId;
    const topic = body?.topic?.trim();
    if (!projectId || !topic || !body?.event) return;

    const room = broadcastRoom(projectId, topic);
    await client.join(room);

    const message: RealtimeBroadcastMessage = {
      topic,
      event: body.event,
      payload: body.payload,
    };

    this.server.to(room).emit(REALTIME_EVENTS.BROADCAST, message);
  }

  private presenceSnapshot(room: string): RealtimePresenceState {
    const roomMap = this.presenceByRoom.get(room);
    if (!roomMap) return {};
    const state: RealtimePresenceState = {};
    for (const [socketId, payload] of roomMap) {
      state[socketId] = payload;
    }
    return state;
  }

  private removePresence(client: RealtimeSocket, topic: string) {
    const projectId = client.data.projectId;
    if (!projectId) return;

    const room = presenceRoom(projectId, topic);
    const roomMap = this.presenceByRoom.get(room);
    if (!roomMap?.has(client.id)) {
      this.socketPresenceTopics.get(client.id)?.delete(topic);
      return;
    }

    const payload = roomMap.get(client.id) ?? {};
    roomMap.delete(client.id);
    if (roomMap.size === 0) {
      this.presenceByRoom.delete(room);
    }

    this.socketPresenceTopics.get(client.id)?.delete(topic);

    this.server.to(room).emit(REALTIME_EVENTS.PRESENCE_LEAVE, {
      topic,
      key: client.id,
      payload,
    });
  }
}
