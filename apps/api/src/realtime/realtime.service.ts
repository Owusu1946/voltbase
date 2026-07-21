import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, neonConfig } from '@neondatabase/serverless';
import { TriggerService } from './trigger.service';
import type { RealtimeEvent } from '@voltbase/types';

neonConfig.webSocketConstructor = WebSocket;

type NotifyCallback = (event: RealtimeEvent) => void;

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private listeners = new Map<
    string,
    {
      client: Client;
      callbacks: Set<NotifyCallback>;
    }
  >();

  constructor(private configService: ConfigService) {}

  // Neon LISTEN/NOTIFY requires a direct (non-pooler) connection
  private getListenConnectionString(): string {
    const realtime = this.configService.get<string>('REALTIME_DATABASE_URL');
    const database = this.configService.get<string>('DATABASE_URL');
    const url = realtime ?? database;
    if (!url) {
      throw new Error('DATABASE_URL is not configured');
    }
    let clean = url.replace('-pooler', '').trim();
    clean = clean.replace(/([?&])(sslmode|channel_binding)=[^&]*/g, '$1');
    clean = clean.replace(/[?&]$/, '').replace(/\?&/, '?');
    return clean;
  }

  async subscribe(
    projectId: string,
    tableName: string,
    callback: NotifyCallback,
  ): Promise<void> {
    const channel = TriggerService.channelName(projectId, tableName);

    const existing = this.listeners.get(channel);
    if (existing) {
      existing.callbacks.add(callback);
      return;
    }

    const client = new Client({
      connectionString: this.getListenConnectionString(),
    });

    await client.connect();

    client.on('notification', (msg) => {
      if (!msg.payload) return;
      try {
        const event = JSON.parse(msg.payload) as RealtimeEvent;
        const entry = this.listeners.get(channel);
        entry?.callbacks.forEach((cb) => cb(event));
      } catch {
        // malformed payload — ignore
      }
    });

    // channel names are lowercase identifiers — no double quotes needed
    await client.query(`LISTEN ${channel}`);

    this.listeners.set(channel, {
      client,
      callbacks: new Set([callback]),
    });
  }

  unsubscribe(
    projectId: string,
    tableName: string,
    callback: NotifyCallback,
  ): void {
    const channel = TriggerService.channelName(projectId, tableName);
    const entry = this.listeners.get(channel);
    if (!entry) return;

    entry.callbacks.delete(callback);

    if (entry.callbacks.size === 0) {
      void entry.client.query(`UNLISTEN ${channel}`).finally(() => {
        void entry.client.end();
      });
      this.listeners.delete(channel);
    }
  }

  async onModuleDestroy() {
    await Promise.all(
      [...this.listeners.values()].map(({ client }) => client.end()),
    );
    this.listeners.clear();
  }
}
