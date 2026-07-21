import { IsIn } from 'class-validator';
import { PROJECT_KEY_ROLES } from '@voltbase/constants';

export class RotateKeyDto {
  @IsIn([PROJECT_KEY_ROLES.ANON, PROJECT_KEY_ROLES.SERVICE_ROLE])
  role!: typeof PROJECT_KEY_ROLES.ANON | typeof PROJECT_KEY_ROLES.SERVICE_ROLE;
}
