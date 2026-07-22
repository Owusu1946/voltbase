import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request as ExpressRequest } from 'express';
import { eq } from 'drizzle-orm';
import { PROJECT_KEY_ROLES } from '@voltbase/constants';
import { ProjectApiService } from './project-api.service';
import { ProjectKeyGuard, ProjectKeyPayload } from './project-key.guard';
import { DrizzleService } from '../db/drizzle.service';
import { projects } from '../db/schema';

@Controller('projects/:projectSlug/rest')
@UseGuards(ProjectKeyGuard)
export class ProjectApiController {
  constructor(
    private projectApiService: ProjectApiService,
    private jwtService: JwtService,
    private drizzle: DrizzleService,
  ) {}

  private getProjectKey(req: ExpressRequest): ProjectKeyPayload {
    return req['projectKey'] as ProjectKeyPayload;
  }

  private async resolveUserJwt(
    projectId: string,
    userToken?: string,
  ): Promise<{ sub: string; email?: string } | null> {
    if (!userToken) return null;
    const token = userToken.startsWith('Bearer ')
      ? userToken.slice(7)
      : userToken;

    const [project] = await this.drizzle.db
      .select({ authJwtSecret: projects.authJwtSecret })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) return null;

    try {
      const payload = this.jwtService.verify<{ sub: string; email?: string }>(
        token,
        { secret: project.authJwtSecret },
      );
      return { sub: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }

  private async buildCtx(
    req: ExpressRequest,
    userToken?: string,
  ) {
    const projectKey = this.getProjectKey(req);
    const userJwt = await this.resolveUserJwt(projectKey.projectId, userToken);
    return { projectKey, userJwt };
  }

  /** Writes allowed for any project key; RLS enforces row access. service_role bypasses RLS. */
  private assertNotBlocked(): void {
    // intentionally empty — retained for clarity / future flags
  }

  @Post('rpc/:fnName')
  async callRpc(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('fnName') fnName: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-user-jwt') userJwtHeader?: string,
  ) {
    this.assertNotBlocked();
    const ctx = await this.buildCtx(req, userJwtHeader);
    return this.projectApiService.callRpc(
      ctx.projectKey.projectId,
      projectSlug,
      fnName,
      body ?? {},
      ctx,
    );
  }

  @Get(':table')
  async getRows(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Query() query: Record<string, string>,
    @Headers('x-user-jwt') userJwtHeader?: string,
  ) {
    const ctx = await this.buildCtx(req, userJwtHeader);
    return this.projectApiService.getRows(
      ctx.projectKey.projectId,
      projectSlug,
      table,
      query,
      ctx,
    );
  }

  @Post(':table')
  async insertRow(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-user-jwt') userJwtHeader?: string,
  ) {
    const ctx = await this.buildCtx(req, userJwtHeader);
    // Without RLS policies, anon/authenticated writes may still succeed via grants;
    // require service_role OR authenticated user JWT for writes when using anon key alone.
    if (
      ctx.projectKey.role !== PROJECT_KEY_ROLES.SERVICE_ROLE &&
      !ctx.userJwt
    ) {
      throw new ForbiddenException({
        message:
          'Write operations require the service role key or an authenticated user JWT (X-User-Jwt)',
        code: 'write_forbidden',
      });
    }
    return this.projectApiService.insertRow(
      ctx.projectKey.projectId,
      projectSlug,
      table,
      body,
      ctx,
    );
  }

  @Patch(':table/:id')
  async updateRow(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-user-jwt') userJwtHeader?: string,
  ) {
    const ctx = await this.buildCtx(req, userJwtHeader);
    if (
      ctx.projectKey.role !== PROJECT_KEY_ROLES.SERVICE_ROLE &&
      !ctx.userJwt
    ) {
      throw new ForbiddenException({
        message:
          'Write operations require the service role key or an authenticated user JWT (X-User-Jwt)',
        code: 'write_forbidden',
      });
    }
    return this.projectApiService.updateRow(
      ctx.projectKey.projectId,
      projectSlug,
      table,
      id,
      body,
      ctx,
    );
  }

  @Delete(':table/:id')
  async deleteRow(
    @Req() req: ExpressRequest,
    @Param('projectSlug') projectSlug: string,
    @Param('table') table: string,
    @Param('id') id: string,
    @Headers('x-user-jwt') userJwtHeader?: string,
  ) {
    const ctx = await this.buildCtx(req, userJwtHeader);
    if (
      ctx.projectKey.role !== PROJECT_KEY_ROLES.SERVICE_ROLE &&
      !ctx.userJwt
    ) {
      throw new ForbiddenException({
        message:
          'Write operations require the service role key or an authenticated user JWT (X-User-Jwt)',
        code: 'write_forbidden',
      });
    }
    return this.projectApiService.deleteRow(
      ctx.projectKey.projectId,
      projectSlug,
      table,
      id,
      ctx,
    );
  }
}
