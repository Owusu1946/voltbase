import { VoltbaseDb } from './db';
import { VoltbaseRealtime } from './realtime';
import { VoltbaseStorage } from './storage';
import { VoltbaseAuth } from './auth';

export class VoltbaseClient {
  readonly db: VoltbaseDb;
  readonly realtime: VoltbaseRealtime;
  readonly storage: VoltbaseStorage;
  readonly auth: VoltbaseAuth;

  constructor(
    private projectUrl: string,
    private apiKey: string,
  ) {
    this.db = new VoltbaseDb(projectUrl, apiKey);
    this.realtime = new VoltbaseRealtime(projectUrl, apiKey);
    this.storage = new VoltbaseStorage(projectUrl, apiKey);
    this.auth = new VoltbaseAuth(projectUrl);
  }

  from<T = Record<string, unknown>>(table: string) {
    return this.db.from<T>(table);
  }
}
