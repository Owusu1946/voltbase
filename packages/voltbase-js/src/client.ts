import { VoltbaseDb } from './db';
import { VoltbaseRealtime } from './realtime';
import { VoltbaseStorage } from './storage';
import { VoltbaseAuth } from './auth';
import type { QueryResult } from './db';

export class VoltbaseClient {
  readonly db: VoltbaseDb;
  readonly realtime: VoltbaseRealtime;
  readonly storage: VoltbaseStorage;
  readonly auth: VoltbaseAuth;

  constructor(
    private projectUrl: string,
    private apiKey: string,
  ) {
    this.auth = new VoltbaseAuth(projectUrl);
    const getUserToken = () => this.auth.getAccessToken();
    this.db = new VoltbaseDb(projectUrl, apiKey, getUserToken);
    this.realtime = new VoltbaseRealtime(projectUrl, apiKey);
    this.storage = new VoltbaseStorage(projectUrl, apiKey);
  }

  from<T = Record<string, unknown>>(table: string) {
    return this.db.from<T>(table);
  }

  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    return this.db.rpc<T>(fn, args);
  }
}
