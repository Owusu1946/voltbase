import { IsEmail } from 'class-validator';
import type { ResendVerificationInput } from '@voltbase/types';

export class ResendVerificationDto implements ResendVerificationInput {
  @IsEmail()
  email!: string;
}
