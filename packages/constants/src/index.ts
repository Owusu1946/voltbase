export const COOKIE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export const ORG_ROLES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
} as const;

export const INVITE_EXPIRES_IN = '24h';

export const PROJECT_KEY_ROLES = {
  ANON: 'anon',
  SERVICE_ROLE: 'service_role',
} as const;

export const COLUMN_TYPES = [
  'text',
  'integer',
  'bigint',
  'boolean',
  'timestamp',
  'uuid',
  'jsonb',
  'numeric',
  'vector',
] as const;

/** Default embedding dimensions (OpenAI text-embedding-3-small). */
export const DEFAULT_VECTOR_DIMENSIONS = 1536;

export const VECTOR_INDEX_METHODS = ['btree', 'hnsw', 'ivfflat'] as const;
export type VectorIndexMethod = (typeof VECTOR_INDEX_METHODS)[number];

export const VECTOR_INDEX_OPS = [
  'vector_cosine_ops',
  'vector_l2_ops',
  'vector_ip_ops',
] as const;
export type VectorIndexOps = (typeof VECTOR_INDEX_OPS)[number];

export const TABLE_EDITOR_INTENT = {
  CREATE_TABLE: 'CREATE_TABLE',
  DELETE_TABLE: 'DELETE_TABLE',
  FETCH_TABLE: 'FETCH_TABLE',
  ADD_COLUMN: 'ADD_COLUMN',
  INSERT_ROW: 'INSERT_ROW',
  DELETE_ROW: 'DELETE_ROW',
} as const;

export type TableEditorIntent =
  (typeof TABLE_EDITOR_INTENT)[keyof typeof TABLE_EDITOR_INTENT];

export const RESERVED_QUERY_PARAMS = new Set([
  'select',
  'order',
  'limit',
  'offset',
]);

export const FILTER_OPERATORS = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
  is: 'IS',
} as const;

export type FilterOperator = keyof typeof FILTER_OPERATORS;

// REALTIME
export const REALTIME_EVENTS = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  EVENT: 'event',
  ERROR: 'error',
  CHANNEL_SUBSCRIBE: 'channel:subscribe',
  CHANNEL_UNSUBSCRIBE: 'channel:unsubscribe',
  PRESENCE_TRACK: 'presence:track',
  PRESENCE_UNTRACK: 'presence:untrack',
  PRESENCE_SYNC: 'presence:sync',
  PRESENCE_JOIN: 'presence:join',
  PRESENCE_LEAVE: 'presence:leave',
  BROADCAST: 'broadcast',
} as const;

// ─── Project Auth ─────────────────────────────────────────────────────────────

export const AUTH_PROVIDERS = {
  EMAIL: 'email',
  GOOGLE: 'google',
  GITHUB: 'github',
} as const;

export const AUTH_TOKEN_TYPES = {
  EMAIL_VERIFY: 'email_verify',
  PASSWORD_RESET: 'password_reset',
} as const;

export const MAGIC_LINK_EXPIRES_IN = '15m';
export const EMAIL_VERIFY_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000; // 1h
