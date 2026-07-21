import { IsEmail, IsString, MinLength } from 'class-validator';
import type { RegisterInput } from '@voltbase/types';

export class RegisterDto implements RegisterInput {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;
}
