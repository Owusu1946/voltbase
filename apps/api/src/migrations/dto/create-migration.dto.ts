import { IsString, MinLength } from 'class-validator';

export class CreateMigrationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  sql!: string;
}
