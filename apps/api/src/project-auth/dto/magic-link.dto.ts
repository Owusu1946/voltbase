import { IsEmail } from 'class-validator';
import type { MagicLinkInput } from '@voltbase/types';

export class MagicLinkDto implements MagicLinkInput {
  @IsEmail()
  email!: string;
}
