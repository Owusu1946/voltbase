import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { RequireOrgRole } from '../auth/decorators/require-org-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@voltbase/types';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgsController {
  constructor(private orgsService: OrgsService) {}

  @Get()
  getMyOrgs(@CurrentUser() user: JwtPayload) {
    return this.orgsService.getMyOrgs(user.sub);
  }

  @Get(':slug')
  getOrgBySlug(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.orgsService.getOrgBySlug(slug, user.sub);
  }

  @Post()
  createOrg(@Body() dto: CreateOrgDto, @CurrentUser() user: JwtPayload) {
    return this.orgsService.createOrg(dto, user.sub);
  }

  @Patch(':slug')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole('admin')
  updateOrg(@Param('slug') slug: string, @Body() dto: UpdateOrgDto) {
    return this.orgsService.updateOrg(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole('admin')
  deleteOrg(@Param('slug') slug: string) {
    return this.orgsService.deleteOrg(slug);
  }
}
