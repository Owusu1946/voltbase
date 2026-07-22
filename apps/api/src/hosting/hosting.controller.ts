import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { RequireOrgRole } from '../auth/decorators/require-org-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HostingService } from './hosting.service';
import { HostingGithubService } from './hosting-github.service';
import type { HostingFrameworkId } from './framework-detect';
import { FRAMEWORK_PRESETS } from './framework-detect';
import type { JwtPayload } from '@voltbase/types';

@Controller('orgs/:slug/projects/:projectSlug/hosting')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class HostingController {
  constructor(
    private hosting: HostingService,
    private github: HostingGithubService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  @Get()
  status(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hosting.getStatus(slug, projectSlug, user.sub);
  }

  @Get('presets')
  presets() {
    return { presets: Object.values(FRAMEWORK_PRESETS) };
  }

  @Get('repos')
  repos(@CurrentUser() user: JwtPayload, @Query('q') q?: string) {
    return this.hosting.listGithubRepos(user.sub, q);
  }

  @Post('detect')
  detect(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      owner: string;
      repo: string;
      branch?: string;
      rootDirectory?: string;
    },
  ) {
    return this.hosting.detectRepoFramework(
      user.sub,
      body.owner,
      body.repo,
      body.branch || 'main',
      body.rootDirectory || '',
    );
  }

  @Post('import')
  @RequireOrgRole('admin')
  importSite(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      owner: string;
      repo: string;
      repoId?: string;
      branch?: string;
      rootDirectory?: string;
      framework?: HostingFrameworkId;
      buildCommand?: string;
      outputDirectory?: string;
      installCommand?: string;
      env?: { key: string; value: string; isSecret?: boolean }[];
    },
  ) {
    return this.hosting.importSite(slug, projectSlug, user.sub, body);
  }

  @Post('redeploy')
  @RequireOrgRole('admin')
  redeploy(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hosting.redeploy(slug, projectSlug, user.sub);
  }

  @Get('env')
  listEnv(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.hosting.listEnv(slug, projectSlug);
  }

  @Post('env')
  @RequireOrgRole('admin')
  upsertEnv(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body()
    body: {
      vars: { key: string; value: string; isSecret?: boolean }[];
      replace?: boolean;
    },
  ) {
    return this.hosting.upsertEnv(slug, projectSlug, body);
  }

  @Delete('env/:key')
  @RequireOrgRole('admin')
  deleteEnv(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('key') key: string,
  ) {
    return this.hosting.deleteEnv(slug, projectSlug, decodeURIComponent(key));
  }

  @Delete()
  @RequireOrgRole('admin')
  disconnect(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.hosting.disconnect(slug, projectSlug);
  }

  @Get('github/connect')
  connectGithub(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const webUrl = this.config.get<string>('WEB_URL')?.replace(/\/$/, '');
    const returnTo = `${webUrl}/organizations/${slug}/${projectSlug}/hosting`;
    const state = this.jwt.sign(
      { userId: user.sub, returnTo },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '10m',
      },
    );
    return { url: this.github.buildAuthorizeUrl(state) };
  }

  @Delete('github')
  async disconnectGithub(@CurrentUser() user: JwtPayload) {
    await this.github.disconnect(user.sub);
    return { ok: true };
  }
}

@Controller('hosting')
export class HostingOauthController {
  constructor(
    private github: HostingGithubService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const webUrl = this.config.get<string>('WEB_URL')?.replace(/\/$/, '');
    try {
      const payload = this.jwt.verify<{ userId: string; returnTo: string }>(
        state,
        { secret: this.config.get<string>('JWT_ACCESS_SECRET') },
      );
      const tokens = await this.github.exchangeCode(code);
      await this.github.upsertConnection(payload.userId, tokens);
      return res.redirect(payload.returnTo || `${webUrl}/organizations`);
    } catch {
      return res.redirect(`${webUrl}/organizations?hosting_github=error`);
    }
  }
}
