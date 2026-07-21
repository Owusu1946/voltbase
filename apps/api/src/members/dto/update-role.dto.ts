import { IsEnum } from 'class-validator';
import { ORG_ROLES } from '@voltbase/constants';
import type { OrgRole } from '@voltbase/types';

export class UpdateRoleDto {
  @IsEnum(ORG_ROLES)
  role!: OrgRole;
}
