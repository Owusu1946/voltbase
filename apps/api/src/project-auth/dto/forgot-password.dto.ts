import { IsEmail } from 'class-validator';
import type { ForgotPasswordInput } from '@voltbase/types';

export class ForgotPasswordDto implements ForgotPasswordInput {
  @IsEmail()
  email!: string;
}
