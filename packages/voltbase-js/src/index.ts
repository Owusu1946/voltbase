import { VoltbaseClient } from './client';

export function createClient(
  projectUrl: string,
  apiKey: string,
): VoltbaseClient {
  return new VoltbaseClient(projectUrl, apiKey);
}

export { VoltbaseClient } from './client';
export { QueryBuilder, VoltbaseDb } from './db';
export type { QueryResult } from './db';
export { VoltbaseRealtime } from './realtime';
export type { RealtimeCallback } from './realtime';
export { VoltbaseStorage } from './storage';
export { VoltbaseAuth } from './auth';
export type {
  AuthResult,
  AuthSession,
  AuthChangeEvent,
} from './auth';
