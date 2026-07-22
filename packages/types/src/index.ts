export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrgRole = 'admin' | 'developer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  dbSchema: string;
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface CreateOrgInput {
  name: string;
}

export interface OrganizationWithMeta extends Organization {
  memberCount: number;
  projectCount: number;
  role: OrgRole;
}

export interface OrgMemberWithUser {
  id: string;
  role: OrgRole;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface InviteMemberInput {
  email: string;
}

export interface UpdateRoleInput {
  role: OrgRole;
}

export interface CreateProjectInput {
  name: string;
}

export interface ProjectWithOrg extends Project {
  org: Pick<Organization, 'id' | 'name' | 'slug'>;
}

export type ColumnType =
  | 'text'
  | 'integer'
  | 'bigint'
  | 'boolean'
  | 'timestamp'
  | 'uuid'
  | 'jsonb'
  | 'numeric';

export interface TableColumn {
  name: string;
  type: ColumnType;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  foreignKey: {
    table: string;
    column: string;
  } | null;
}

export interface TableIndex {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
}

export interface TableUniqueConstraint {
  name: string;
  columns: string[];
}

export interface TableForeignKey {
  name: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
  onDelete: string | null;
  onUpdate: string | null;
}

export interface TablePolicy {
  name: string;
  cmd: string;
  roles: string[];
  using: string | null;
  withCheck: string | null;
  permissive: boolean;
}

export interface TableInfo {
  name: string;
  columns: TableColumn[];
  indexes: TableIndex[];
  uniqueConstraints: TableUniqueConstraint[];
  foreignKeys: TableForeignKey[];
  rlsEnabled: boolean;
  policies: TablePolicy[];
}

export interface CreateColumnInput {
  name: string;
  type: ColumnType;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  unique?: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

export interface CreateTableInput {
  name: string;
  columns: CreateColumnInput[];
}

// API DOCS
export interface ProjectApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  example: string;
}

export interface ProjectApiDocs {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  tables: {
    name: string;
    endpoints: ProjectApiEndpoint[];
  }[];
}

export interface ProjectBySlugResponse {
  projects: Project;
  organizations: Organization;
  org_members: OrgMember;
}

// SQL EDITOR
export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  command?: string;
}

export interface QueryHistoryItem {
  id: string;
  projectId: string;
  sql: string;
  executionTimeMs: number;
  rowCount: number;
  createdAt: string;
}

// PROJECT MIGRATIONS
export interface ProjectMigration {
  id: string;
  projectId: string;
  version: number;
  name: string;
  sql: string;
  checksum: string;
  appliedAt: string;
  appliedBy: string | null;
}

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export type RealtimeCdcEventFilter = RealtimeEventType | '*';

/** CDC subscribe body — string table name still accepted by the gateway. */
export interface RealtimeSubscribePayload {
  table: string;
  /** Defaults to `*` (all event types). */
  event?: RealtimeCdcEventFilter;
  /** Equality-only filters matched against the row (`record` / `oldRecord`). */
  filter?: Record<string, string>;
}

export interface RealtimeEvent {
  type: RealtimeEventType;
  table: string;
  record: Record<string, unknown>;
  oldRecord?: Record<string, unknown>; // only on UPDATE and DELETE
  projectId: string;
  timestamp: string;
}

export interface RealtimeBroadcastMessage {
  topic: string;
  event: string;
  payload: unknown;
}

export interface RealtimePresenceTrackPayload {
  topic: string;
  payload?: Record<string, unknown>;
}

export type RealtimePresenceState = Record<string, Record<string, unknown>>;

// Storage
export type BucketAccess = 'public' | 'private';

export interface StorageBucket {
  id: string;
  projectId: string;
  name: string;
  access: BucketAccess;
  createdAt: string;
}

export interface StorageObject {
  id: string;
  bucketId: string;
  name: string;
  size: number;
  mimeType: string;
  utKey: string; // UploadThing file key — used to delete or get signed URL
  url: string; // public URL (public buckets) or empty string (private)
  createdAt: string;
}

export interface CreateBucketInput {
  name: string;
  access: BucketAccess;
}
// AUTH
export interface ProjectAuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  provider: 'email' | 'google' | 'github';
  createdAt: string;
}

export interface SignUpInput {
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface MagicLinkInput {
  email: string;
}

export interface ResendVerificationInput {
  email: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ProjectOAuthSettings {
  siteUrl: string | null;
  googleClientId: string | null;
  googleClientSecret: string | null;
  githubClientId: string | null;
  githubClientSecret: string | null;
}

export interface ProjectAuthResponse {
  user: { id: string; email: string };
  accessToken: string;
}
