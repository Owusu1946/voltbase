import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
export class ProjectsService {
  constructor(
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

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
    await this.drizzle.db.execute(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
  }

  private async dropSchema(dbSchema: string): Promise<void> {
    await this.drizzle.db.execute(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
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
