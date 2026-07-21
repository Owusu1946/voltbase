import { IsEmail, IsString, MinLength } from 'class-validator';
import type { SignUpInput } from '@voltbase/types';

export class SignUpDto implements SignUpInput {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
