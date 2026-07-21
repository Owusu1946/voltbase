import { IsEmail, IsString } from 'class-validator';
import type { SignInInput } from '@voltbase/types';

export class SignInDto implements SignInInput {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
