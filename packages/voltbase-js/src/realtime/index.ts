import { io, type Socket } from 'socket.io-client';
import { REALTIME_EVENTS } from '@voltbase/constants';
import type {
  RealtimeBroadcastMessage,
  RealtimeCdcEventFilter,
  RealtimeEvent,
  RealtimePresenceState,
  RealtimeSubscribePayload,
} from '@voltbase/types';

export type RealtimeCallback = (event: RealtimeEvent) => void;

export type RealtimeSubscribeOptions = {
  event?: RealtimeCdcEventFilter;
  filter?: Record<string, string>;
};

type TableSubscription = {
  table: string;
  callback: RealtimeCallback;
  opts: RealtimeSubscribeOptions;
};

export type BroadcastCallback = (message: RealtimeBroadcastMessage) => void;

export type PresenceSyncPayload = {
  topic: string;
  state: RealtimePresenceState;
};

export type PresenceJoinLeavePayload = {
  topic: string;
  key: string;
  payload: Record<string, unknown>;
};

export type PresenceCallback =
  | ((payload: PresenceSyncPayload) => void)
  | ((payload: PresenceJoinLeavePayload) => void);

function getRealtimeSocketUrl(projectUrl: string): string {
  const origin = new URL(projectUrl).origin;
  // NestJS gateway namespace is /realtime on the API host, NOT under /api
  return `${origin}/realtime`;
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

function matchesSubscribeOpts(
  event: RealtimeEvent,
  opts: RealtimeSubscribeOptions,
): boolean {
  if (opts.event && opts.event !== '*' && event.type !== opts.event) {
    return false;
  }
  if (!opts.filter || Object.keys(opts.filter).length === 0) return true;
  if (event.type === 'DELETE') {
    return rowMatchesFilter(event.oldRecord ?? event.record, opts.filter);
  }
  return rowMatchesFilter(event.record, opts.filter);
}

function toSubscribeBody(
  table: string,
  opts?: RealtimeSubscribeOptions,
): string | RealtimeSubscribePayload {
  if (!opts || (!opts.event && !opts.filter)) return table;
  return {
    table,
    ...(opts.event ? { event: opts.event } : {}),
    ...(opts.filter ? { filter: opts.filter } : {}),
  };
}

export class RealtimeChannel {
  private broadcastHandlers = new Map<string, Set<BroadcastCallback>>();
  private presenceHandlers = new Map<string, Set<(payload: unknown) => void>>();
  private joined = false;
  private presenceState: RealtimePresenceState = {};

  constructor(
    private realtime: VoltbaseRealtime,
    private topic: string,
  ) {}

  on(
    type: 'broadcast',
    filter: { event: string } | string,
    callback: BroadcastCallback,
  ): this;
  on(
    type: 'presence',
    filter: { event: 'sync' | 'join' | 'leave' } | 'sync' | 'join' | 'leave',
    callback: PresenceCallback,
  ): this;
  on(
    type: 'broadcast' | 'presence',
    filter:
      | { event: string }
      | string,
    callback: BroadcastCallback | PresenceCallback,
  ): this {
    const eventName =
      typeof filter === 'string' ? filter : filter.event;

    if (type === 'broadcast') {
      if (!this.broadcastHandlers.has(eventName)) {
        this.broadcastHandlers.set(eventName, new Set());
      }
      this.broadcastHandlers.get(eventName)!.add(callback as BroadcastCallback);
    } else {
      if (!this.presenceHandlers.has(eventName)) {
        this.presenceHandlers.set(eventName, new Set());
      }
      this.presenceHandlers
        .get(eventName)!
        .add(callback as (payload: unknown) => void);
    }

    return this;
  }

  subscribe(statusCallback?: (status: 'subscribed') => void): this {
    this.realtime.ensureConnected();
    this.realtime.registerChannel(this);
    this.realtime.getSocket()?.emit(REALTIME_EVENTS.CHANNEL_SUBSCRIBE, {
      topic: this.topic,
    });
    this.joined = true;
    statusCallback?.('subscribed');
    return this;
  }

  unsubscribe(): this {
    if (!this.joined) return this;
    this.realtime.getSocket()?.emit(REALTIME_EVENTS.CHANNEL_UNSUBSCRIBE, {
      topic: this.topic,
    });
    this.realtime.unregisterChannel(this);
    this.joined = false;
    this.presenceState = {};
    return this;
  }

  send(args: {
    type: 'broadcast';
    event: string;
    payload?: unknown;
  }): void {
    this.realtime.ensureConnected();
    this.realtime.getSocket()?.emit(REALTIME_EVENTS.BROADCAST, {
      topic: this.topic,
      event: args.event,
      payload: args.payload,
    } satisfies RealtimeBroadcastMessage);
  }

  track(state: Record<string, unknown> = {}): void {
    this.realtime.ensureConnected();
    this.realtime.getSocket()?.emit(REALTIME_EVENTS.PRESENCE_TRACK, {
      topic: this.topic,
      payload: state,
    });
  }

  untrack(): void {
    this.realtime.getSocket()?.emit(REALTIME_EVENTS.PRESENCE_UNTRACK, {
      topic: this.topic,
    });
  }

  presenceStateSnapshot(): RealtimePresenceState {
    return { ...this.presenceState };
  }

  /** @internal */
  handleBroadcast(message: RealtimeBroadcastMessage): void {
    if (message.topic !== this.topic) return;
    const exact = this.broadcastHandlers.get(message.event);
    exact?.forEach((cb) => cb(message));
    const all = this.broadcastHandlers.get('*');
    all?.forEach((cb) => cb(message));
  }

  /** @internal */
  handlePresenceSync(payload: PresenceSyncPayload): void {
    if (payload.topic !== this.topic) return;
    this.presenceState = payload.state ?? {};
    this.presenceHandlers.get('sync')?.forEach((cb) => cb(payload));
  }

  /** @internal */
  handlePresenceJoin(payload: PresenceJoinLeavePayload): void {
    if (payload.topic !== this.topic) return;
    this.presenceState[payload.key] = payload.payload;
    this.presenceHandlers.get('join')?.forEach((cb) => cb(payload));
  }

  /** @internal */
  handlePresenceLeave(payload: PresenceJoinLeavePayload): void {
    if (payload.topic !== this.topic) return;
    delete this.presenceState[payload.key];
    this.presenceHandlers.get('leave')?.forEach((cb) => cb(payload));
  }

  /** @internal */
  getTopic(): string {
    return this.topic;
  }

  /** @internal */
  rejoin(socket: Socket): void {
    if (!this.joined) return;
    socket.emit(REALTIME_EVENTS.CHANNEL_SUBSCRIBE, { topic: this.topic });
  }
}

export class VoltbaseRealtime {
  private socket: Socket | null = null;
  private tableSubs: TableSubscription[] = [];
  private channels = new Set<RealtimeChannel>();

  constructor(
    private projectUrl: string,
    private apiKey: string,
  ) {}

  /** @internal */
  getSocket(): Socket | null {
    return this.socket;
  }

  /** @internal */
  ensureConnected(): Socket {
    return this.connect();
  }

  /** @internal */
  registerChannel(channel: RealtimeChannel): void {
    this.channels.add(channel);
  }

  /** @internal */
  unregisterChannel(channel: RealtimeChannel): void {
    this.channels.delete(channel);
  }

  private connect(): Socket {
    if (this.socket?.connected) return this.socket;
    if (this.socket) return this.socket;

    this.socket = io(getRealtimeSocketUrl(this.projectUrl), {
      auth: { token: this.apiKey },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      const seen = new Set<string>();
      for (const sub of this.tableSubs) {
        const key = JSON.stringify(toSubscribeBody(sub.table, sub.opts));
        if (seen.has(key)) continue;
        seen.add(key);
        this.socket?.emit(
          REALTIME_EVENTS.SUBSCRIBE,
          toSubscribeBody(sub.table, sub.opts),
        );
      }
      for (const channel of this.channels) {
        channel.rejoin(this.socket!);
      }
    });

    this.socket.on(REALTIME_EVENTS.EVENT, (event: RealtimeEvent) => {
      for (const sub of this.tableSubs) {
        if (sub.table !== event.table) continue;
        if (!matchesSubscribeOpts(event, sub.opts)) continue;
        sub.callback(event);
      }
    });

    this.socket.on(
      REALTIME_EVENTS.BROADCAST,
      (message: RealtimeBroadcastMessage) => {
        for (const channel of this.channels) {
          channel.handleBroadcast(message);
        }
      },
    );

    this.socket.on(
      REALTIME_EVENTS.PRESENCE_SYNC,
      (payload: PresenceSyncPayload) => {
        for (const channel of this.channels) {
          channel.handlePresenceSync(payload);
        }
      },
    );

    this.socket.on(
      REALTIME_EVENTS.PRESENCE_JOIN,
      (payload: PresenceJoinLeavePayload) => {
        for (const channel of this.channels) {
          channel.handlePresenceJoin(payload);
        }
      },
    );

    this.socket.on(
      REALTIME_EVENTS.PRESENCE_LEAVE,
      (payload: PresenceJoinLeavePayload) => {
        for (const channel of this.channels) {
          channel.handlePresenceLeave(payload);
        }
      },
    );

    this.socket.on(REALTIME_EVENTS.ERROR, (msg: string) => {
      console.error('[voltbase-js] realtime error:', msg);
    });

    return this.socket;
  }

  subscribe(
    table: string,
    callback: RealtimeCallback,
    opts?: RealtimeSubscribeOptions,
  ): () => void {
    const socket = this.connect();
    const normalizedOpts: RealtimeSubscribeOptions = {
      event: opts?.event ?? '*',
      filter: opts?.filter,
    };

    const alreadySubscribed = this.tableSubs.some(
      (s) =>
        s.table === table &&
        s.opts.event === normalizedOpts.event &&
        JSON.stringify(s.opts.filter ?? {}) ===
          JSON.stringify(normalizedOpts.filter ?? {}),
    );

    this.tableSubs.push({ table, callback, opts: normalizedOpts });

    if (!alreadySubscribed) {
      socket.emit(
        REALTIME_EVENTS.SUBSCRIBE,
        toSubscribeBody(table, normalizedOpts),
      );
    }

    return () => this.unsubscribe(table, callback);
  }

  unsubscribe(table: string, callback?: RealtimeCallback): void {
    if (!callback) {
      this.tableSubs = this.tableSubs.filter((s) => s.table !== table);
      this.socket?.emit(REALTIME_EVENTS.UNSUBSCRIBE, table);
      return;
    }

    this.tableSubs = this.tableSubs.filter(
      (s) => !(s.table === table && s.callback === callback),
    );

    const stillListening = this.tableSubs.some((s) => s.table === table);
    if (!stillListening) {
      this.socket?.emit(REALTIME_EVENTS.UNSUBSCRIBE, table);
    }
  }

  channel(topic: string): RealtimeChannel {
    this.connect();
    return new RealtimeChannel(this, topic);
  }

  disconnect(): void {
    for (const channel of [...this.channels]) {
      channel.unsubscribe();
    }
    this.socket?.disconnect();
    this.socket = null;
    this.tableSubs = [];
    this.channels.clear();
  }
}
