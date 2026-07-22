import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { createHash } from 'crypto';
import { and, desc, eq, max } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  organizations,
  projectMigrations,
  projects,
} from '../db/schema';

@Injectable()
export class MigrationsService {
  constructor(private drizzle: DrizzleService) {}

  private assertSafeIdentifier(name: string, label: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new BadRequestException(`Invalid ${label}: ${name}`);
    }
  }

  private parseSingleStatement(querySql: string): string {
    const statements = querySql
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (statements.length === 0) {
      throw new BadRequestException('SQL query cannot be empty');
    }

    if (statements.length > 1) {
      throw new BadRequestException(
        'Only one SQL statement per run. Remove extra statements after a semicolon (e.g. a trailing SELECT).',
      );
    }

    return statements[0];
  }

  private getNeonClient(): NeonQueryFunction<false, true> {
    const client = (
      this.drizzle.db as unknown as {
        $client: NeonQueryFunction<false, true>;
      }
    ).$client;

    if (!client?.transaction) {
      throw new Error('Neon HTTP client is not available');
    }

    return client;
  }

  private checksum(sql: string): string {
    return createHash('sha256').update(sql).digest('hex');
  }

  private async getProject(orgSlug: string, projectSlug: string) {
    const [row] = await this.drizzle.db
      .select({
        id: projects.id,
        dbSchema: projects.dbSchema,
      })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Project not found');
    return row;
  }

  async listMigrations(orgSlug: string, projectSlug: string) {
    const project = await this.getProject(orgSlug, projectSlug);

    return this.drizzle.db
      .select()
      .from(projectMigrations)
      .where(eq(projectMigrations.projectId, project.id))
      .orderBy(desc(projectMigrations.version));
  }

  async getMigration(orgSlug: string, projectSlug: string, id: string) {
    const project = await this.getProject(orgSlug, projectSlug);

    const [row] = await this.drizzle.db
      .select()
      .from(projectMigrations)
      .where(
        and(
          eq(projectMigrations.id, id),
          eq(projectMigrations.projectId, project.id),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Migration not found');
    return row;
  }

  async applyMigration(
    orgSlug: string,
    projectSlug: string,
    name: string,
    querySql: string,
    appliedBy: string,
  ) {
    const project = await this.getProject(orgSlug, projectSlug);
    const statement = this.parseSingleStatement(querySql);

    const normalised = statement.trim().toUpperCase();
    const blocked = ['DROP DATABASE', 'DROP SCHEMA', 'TRUNCATE'];
    if (blocked.some((b) => normalised.startsWith(b))) {
      throw new BadRequestException('This statement is not allowed');
    }

    this.assertSafeIdentifier(project.dbSchema, 'project schema');

    try {
      const neonSql = this.getNeonClient();

      await neonSql.transaction(
        (txn) => [
          txn`SET LOCAL search_path TO ${txn.unsafe(`"${project.dbSchema}", public`)}`,
          txn`${txn.unsafe(statement)}`,
        ],
        { fullResults: true, readOnly: false },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Migration failed';
      throw new BadRequestException(message);
    }

    const [versionRow] = await this.drizzle.db
      .select({ maxVersion: max(projectMigrations.version) })
      .from(projectMigrations)
      .where(eq(projectMigrations.projectId, project.id));

    const nextVersion = (versionRow?.maxVersion ?? 0) + 1;

    const [created] = await this.drizzle.db
      .insert(projectMigrations)
      .values({
        projectId: project.id,
        version: nextVersion,
        name: name.trim(),
        sql: querySql,
        checksum: this.checksum(querySql),
        appliedBy,
      })
      .returning();

    return created;
  }
}
