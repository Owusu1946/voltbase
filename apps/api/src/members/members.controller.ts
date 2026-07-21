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
import { MembersService } from './members.service';
import { InviteService } from './invite.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgRoleGuard } from '../auth/guards/org-role.guard';
import { RequireOrgRole } from '../auth/decorators/require-org-role.decorator';

@Controller('orgs/:slug/members')
@UseGuards(JwtAuthGuard, OrgRoleGuard)
export class MembersController {
  constructor(
    private membersService: MembersService,
    private inviteService: InviteService,
  ) {}

  @Get()
  getMembers(@Param('slug') slug: string) {
    return this.membersService.getMembers(slug);
  }

  @Patch(':memberId/role')
  @RequireOrgRole('admin')
  updateRole(
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.membersService.updateRole(slug, memberId, dto);
  }

  @Delete(':memberId')
  @RequireOrgRole('admin')
  removeMember(
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.removeMember(slug, memberId);
  }

  @Post('invite')
  @RequireOrgRole('admin')
  sendInvite(@Param('slug') slug: string, @Body() dto: InviteMemberDto) {
    return this.inviteService.sendInvite(slug, dto.email);
  }
}
