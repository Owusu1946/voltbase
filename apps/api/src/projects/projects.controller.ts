import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { RequireOrgRole } from '../auth/decorators/require-org-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@voltbase/types';

@Controller('orgs/:slug/projects')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  getProjects(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.getProjectsForOrg(slug, user.sub);
  }

  @Get(':projectSlug')
  getProject(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.getProjectBySlug(slug, projectSlug, user.sub);
  }

  @Post()
  @RequireOrgRole('admin')
  createProject(@Param('slug') slug: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(slug, dto);
  }
}
