import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { CreateMigrationDto } from './dto/create-migration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { RequireOrgRole } from '../auth/decorators/require-org-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@voltbase/types';

@Controller('orgs/:slug/projects/:projectSlug/migrations')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class MigrationsController {
  constructor(private migrationsService: MigrationsService) {}

  @Get()
  listMigrations(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
  ) {
    return this.migrationsService.listMigrations(slug, projectSlug);
  }

  @Get(':id')
  getMigration(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
  ) {
    return this.migrationsService.getMigration(slug, projectSlug, id);
  }

  @Post()
  @RequireOrgRole('admin')
  applyMigration(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateMigrationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.migrationsService.applyMigration(
      slug,
      projectSlug,
      dto.name,
      dto.sql,
      user.sub,
    );
  }
}
