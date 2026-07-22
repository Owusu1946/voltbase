import { IsString, MinLength } from 'class-validator';
import type { ResetPasswordInput } from '@voltbase/types';

export class ResetPasswordDto implements ResetPasswordInput {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
