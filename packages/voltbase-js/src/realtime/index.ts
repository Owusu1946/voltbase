import { io, type Socket } from 'socket.io-client';
import { REALTIME_EVENTS } from '@voltbase/constants';
import type { RealtimeEvent } from '@voltbase/types';

export type RealtimeCallback = (event: RealtimeEvent) => void;

function getRealtimeSocketUrl(projectUrl: string): string {
  const origin = new URL(projectUrl).origin;
  // NestJS gateway namespace is /realtime on the API host, NOT under /api
  return `${origin}/realtime`;
}

export class VoltbaseRealtime {
  private socket: Socket | null = null;
  private callbacks = new Map<string, Set<RealtimeCallback>>();

  constructor(
    private projectUrl: string,
    private apiKey: string,
  ) {}

  private connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(getRealtimeSocketUrl(this.projectUrl), {
      auth: { token: this.apiKey },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      for (const table of this.callbacks.keys()) {
        this.socket?.emit(REALTIME_EVENTS.SUBSCRIBE, table);
      }
    });

    this.socket.on(REALTIME_EVENTS.EVENT, (event: RealtimeEvent) => {
      const handlers = this.callbacks.get(event.table);
      handlers?.forEach((cb) => cb(event));
    });

    this.socket.on(REALTIME_EVENTS.ERROR, (msg: string) => {
      console.error('[voltbase-js] realtime error:', msg);
    });

    return this.socket;
  }

  subscribe(table: string, callback: RealtimeCallback): () => void {
    const socket = this.connect();

    if (!this.callbacks.has(table)) {
      this.callbacks.set(table, new Set());
      socket.emit(REALTIME_EVENTS.SUBSCRIBE, table);
    }

    this.callbacks.get(table)!.add(callback);

    return () => this.unsubscribe(table, callback);
  }

  unsubscribe(table: string, callback?: RealtimeCallback): void {
    if (!callback) {
      this.callbacks.delete(table);
      this.socket?.emit(REALTIME_EVENTS.UNSUBSCRIBE, table);
      return;
    }

    const handlers = this.callbacks.get(table);
    if (!handlers) return;

    handlers.delete(callback);

    if (handlers.size === 0) {
      this.callbacks.delete(table);
      this.socket?.emit(REALTIME_EVENTS.UNSUBSCRIBE, table);
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.callbacks.clear();
  }
}
