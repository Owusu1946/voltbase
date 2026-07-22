import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const projectMigrations = pgTable('project_migrations', {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  name: text('name').notNull(),
  sql: text('sql').notNull(),
  checksum: text('checksum').notNull(),
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
  appliedBy: uuid('applied_by'),
});

export type ProjectMigration = typeof projectMigrations.$inferSelect;
export type NewProjectMigration = typeof projectMigrations.$inferInsert;
