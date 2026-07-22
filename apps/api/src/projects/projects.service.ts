import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import slugify from 'slugify';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '../db/drizzle.service';
import { projects, organizations, orgMembers } from '../db/schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PROJECT_KEY_ROLES } from '@voltbase/constants';
import type { Project } from '../db/schema/projects';

@Injectable()
export class ProjectsService implements OnModuleInit {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureVectorExtension();
    } catch (err) {
      this.logger.warn(
        `pgvector not enabled at startup: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Enable Neon pgvector once per database (shared by all project schemas). */
  async ensureVectorExtension(): Promise<{ enabled: boolean; version: string | null }> {
    try {
      await this.drizzle.db.execute(
        `CREATE EXTENSION IF NOT EXISTS vector`,
      );
      // Allow project anon/authenticated roles to cast and use the type
      await this.drizzle.db.execute(
        `GRANT USAGE ON TYPE public.vector TO PUBLIC`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException({
        message:
          'Failed to enable pgvector. Ensure the database role can CREATE EXTENSION vector.',
        code: 'vector_extension_failed',
        details: message,
      });
    }

    return this.getVectorExtensionStatus();
  }

  async getVectorExtensionStatus(): Promise<{
    enabled: boolean;
    version: string | null;
  }> {
    const result = await this.drizzle.db.execute<{ extversion: string }>(
      `SELECT extversion FROM pg_extension WHERE extname = 'vector' LIMIT 1`,
    );
    const version = result.rows[0]?.extversion ?? null;
    return { enabled: Boolean(version), version };
  }

  private generateProjectSlug(name: string): string {
    const base = slugify(name, { lower: true, strict: true });
    const suffix = randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }

  private generateDbSchema(): string {
    return `proj_${randomBytes(4).toString('hex')}`;
  }

  private signProjectKey(
    projectId: string,
    role: string,
    version: number,
  ): string {
    return this.jwtService.sign(
      { projectId, role, v: version },
      {
        secret: this.configService.get<string>('PROJECT_JWT_SECRET'),
        expiresIn: '100y',
      },
    );
  }

  private async provisionSchema(dbSchema: string): Promise<void> {
    await this.ensureVectorExtension();
    await this.drizzle.db.execute(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    await this.ensureProjectRoles(dbSchema);
  }

  /** Create anon/authenticated NOLOGIN roles + uid() helper for RLS. Idempotent. */
  async ensureProjectRoles(dbSchema: string): Promise<void> {
    const anon = `${dbSchema}_anon`;
    const auth = `${dbSchema}_authenticated`;

    await this.drizzle.db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${anon}') THEN
          CREATE ROLE "${anon}" NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${auth}') THEN
          CREATE ROLE "${auth}" NOLOGIN NOINHERIT;
        END IF;
      END
      $$;
    `);

    await this.drizzle.db.execute(
      `GRANT USAGE ON SCHEMA "${dbSchema}" TO "${anon}", "${auth}"`,
    );
    // pgvector type lives in public — roles need USAGE to cast/insert embeddings
    await this.drizzle.db.execute(
      `GRANT USAGE ON SCHEMA public TO "${anon}", "${auth}"`,
    );
    await this.drizzle.db.execute(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${dbSchema}" TO "${anon}", "${auth}"`,
    );
    await this.drizzle.db.execute(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "${dbSchema}" TO "${anon}", "${auth}"`,
    );
    await this.drizzle.db.execute(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA "${dbSchema}"
       GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${anon}", "${auth}"`,
    );
    await this.drizzle.db.execute(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA "${dbSchema}"
       GRANT USAGE, SELECT ON SEQUENCES TO "${anon}", "${auth}"`,
    );
    await this.drizzle.db.execute(
      `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "${dbSchema}" TO "${anon}", "${auth}"`,
    );
    await this.drizzle.db.execute(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA "${dbSchema}"
       GRANT EXECUTE ON FUNCTIONS TO "${anon}", "${auth}"`,
    );

    // Allow the connection role to assume these roles
    await this.drizzle.db.execute(
      `GRANT "${anon}", "${auth}" TO CURRENT_USER`,
    );

    await this.drizzle.db.execute(`
      CREATE OR REPLACE FUNCTION "${dbSchema}".uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $fn$;
    `);

    await this.drizzle.db.execute(
      `GRANT EXECUTE ON FUNCTION "${dbSchema}".uid() TO "${anon}", "${auth}"`,
    );
  }

  private async dropSchema(dbSchema: string): Promise<void> {
    await this.drizzle.db.execute(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    const anon = `${dbSchema}_anon`;
    const auth = `${dbSchema}_authenticated`;
    await this.drizzle.db.execute(`DROP ROLE IF EXISTS "${anon}"`);
    await this.drizzle.db.execute(`DROP ROLE IF EXISTS "${auth}"`);
  }

  private async resolveProject(
    orgSlug: string,
    projectSlug: string,
  ): Promise<Project> {
    const [row] = await this.drizzle.db
      .select({ project: projects })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Project not found');
    return row.project;
  }

  async getProjectsForOrg(orgSlug: string, userId: string) {
    return this.drizzle.db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        projectUrl: projects.projectUrl,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .innerJoin(
        orgMembers,
        and(
          eq(orgMembers.orgId, organizations.id),
          eq(orgMembers.userId, userId),
          isNull(orgMembers.removedAt),
        ),
      )
      .where(eq(organizations.slug, orgSlug));
  }

  async getProjectBySlug(orgSlug: string, projectSlug: string, userId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .innerJoin(
        orgMembers,
        and(
          eq(orgMembers.orgId, organizations.id),
          eq(orgMembers.userId, userId),
          isNull(orgMembers.removedAt),
        ),
      )
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Project not found');
    return row;
  }

  async createProject(orgSlug: string, dto: CreateProjectDto) {
    const [org] = await this.drizzle.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (!org) throw new NotFoundException('Organization not found');

    const projectSlug = this.generateProjectSlug(dto.name);
    const dbSchema = this.generateDbSchema();
    const projectUrl = `${this.configService.get<string>('API_URL')}/projects/${projectSlug}`;
    const authJwtSecret = randomBytes(32).toString('hex');

    await this.provisionSchema(dbSchema);

    const [project] = await this.drizzle.db
      .insert(projects)
      .values({
        orgId: org.id,
        name: dto.name,
        slug: projectSlug,
        dbSchema,
        projectUrl,
        anonKey: '',
        serviceRoleKey: '',
        authJwtSecret,
      })
      .returning();

    const anonKey = this.signProjectKey(
      project.id,
      PROJECT_KEY_ROLES.ANON,
      project.anonKeyVersion,
    );
    const serviceRoleKey = this.signProjectKey(
      project.id,
      PROJECT_KEY_ROLES.SERVICE_ROLE,
      project.serviceRoleKeyVersion,
    );

    const [updated] = await this.drizzle.db
      .update(projects)
      .set({ anonKey, serviceRoleKey })
      .where(eq(projects.id, project.id))
      .returning();

    return updated;
  }

  async updateProject(
    orgSlug: string,
    projectSlug: string,
    dto: UpdateProjectDto,
  ) {
    const project = await this.resolveProject(orgSlug, projectSlug);

    const [updated] = await this.drizzle.db
      .update(projects)
      .set({ name: dto.name, updatedAt: new Date() })
      .where(eq(projects.id, project.id))
      .returning();

    return updated;
  }

  async deleteProject(orgSlug: string, projectSlug: string) {
    const project = await this.resolveProject(orgSlug, projectSlug);
    await this.dropSchema(project.dbSchema);
    await this.drizzle.db.delete(projects).where(eq(projects.id, project.id));
    return { ok: true };
  }

  async deleteProjectRow(project: Project) {
    await this.dropSchema(project.dbSchema);
    await this.drizzle.db.delete(projects).where(eq(projects.id, project.id));
  }

  async rotateProjectKey(
    orgSlug: string,
    projectSlug: string,
    role: typeof PROJECT_KEY_ROLES.ANON | typeof PROJECT_KEY_ROLES.SERVICE_ROLE,
  ) {
    const project = await this.resolveProject(orgSlug, projectSlug);

    if (role === PROJECT_KEY_ROLES.ANON) {
      const nextVersion = project.anonKeyVersion + 1;
      const anonKey = this.signProjectKey(
        project.id,
        PROJECT_KEY_ROLES.ANON,
        nextVersion,
      );
      const [updated] = await this.drizzle.db
        .update(projects)
        .set({
          anonKey,
          anonKeyVersion: nextVersion,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, project.id))
        .returning();

      if (!updated) throw new BadRequestException('Failed to rotate key');
      return { role, key: anonKey, version: nextVersion };
    }

    const nextVersion = project.serviceRoleKeyVersion + 1;
    const serviceRoleKey = this.signProjectKey(
      project.id,
      PROJECT_KEY_ROLES.SERVICE_ROLE,
      nextVersion,
    );
    await this.drizzle.db
      .update(projects)
      .set({
        serviceRoleKey,
        serviceRoleKeyVersion: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));

    return { role, key: serviceRoleKey, version: nextVersion };
  }
}
