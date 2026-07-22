import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

export const hostingGithubConnections = pgTable('hosting_github_connections', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  githubUserId: text('github_user_id').notNull(),
  githubLogin: text('github_login').notNull(),
  accessToken: text('access_token').notNull(),
  scope: text('scope'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const hostedSites = pgTable(
  'hosted_sites',
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    githubOwner: text('github_owner').notNull(),
    githubRepo: text('github_repo').notNull(),
    githubRepoId: text('github_repo_id'),
    branch: text('branch').notNull().default('main'),
    rootDirectory: text('root_directory').notNull().default(''),
    framework: text('framework').notNull().default('vite'),
    buildCommand: text('build_command').notNull().default('npm run build'),
    outputDirectory: text('output_directory').notNull().default('dist'),
    installCommand: text('install_command').notNull().default('npm install'),
    cfPagesProjectName: text('cf_pages_project_name').notNull(),
    productionUrl: text('production_url'),
    pagesDevUrl: text('pages_dev_url'),
    status: text('status').notNull().default('idle'),
    lastDeployId: text('last_deploy_id'),
    lastDeployStatus: text('last_deploy_status'),
    lastCommitSha: text('last_commit_sha'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('hosted_sites_project_id_uidx').on(t.projectId)],
);

export const hostedSiteEnv = pgTable('hosted_site_env', {
  id: uuid().defaultRandom().primaryKey(),
  hostedSiteId: uuid('hosted_site_id')
    .notNull()
    .references(() => hostedSites.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  isSecret: boolean('is_secret').notNull().default(false),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const hostedDeployments = pgTable('hosted_deployments', {
  id: uuid().defaultRandom().primaryKey(),
  hostedSiteId: uuid('hosted_site_id')
    .notNull()
    .references(() => hostedSites.id, { onDelete: 'cascade' }),
  cfDeploymentId: text('cf_deployment_id'),
  status: text('status').notNull().default('queued'),
  stage: text('stage').notNull().default('queued'),
  url: text('url'),
  commitSha: text('commit_sha'),
  commitMessage: text('commit_message'),
  environment: text('environment').notNull().default('production'),
  errorMessage: text('error_message'),
  /** JSON map of stage → captured stdout/stderr */
  logs: text('logs'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type HostingGithubConnection = typeof hostingGithubConnections.$inferSelect;
export type HostedSite = typeof hostedSites.$inferSelect;
export type HostedSiteEnv = typeof hostedSiteEnv.$inferSelect;
export type HostedDeployment = typeof hostedDeployments.$inferSelect;
