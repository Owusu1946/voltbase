import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';

export class CreateIndexDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  columns!: string[];

  @IsOptional()
  @IsBoolean()
  unique?: boolean;
}

export class CreateUniqueConstraintDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  columns!: string[];
}

const FK_ACTIONS = [
  'NO ACTION',
  'RESTRICT',
  'CASCADE',
  'SET NULL',
  'SET DEFAULT',
] as const;

export class CreateForeignKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  columns!: string[];

  @IsString()
  refTable!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  refColumns!: string[];

  @IsOptional()
  @IsIn(FK_ACTIONS)
  onDelete?: (typeof FK_ACTIONS)[number];

  @IsOptional()
  @IsIn(FK_ACTIONS)
  onUpdate?: (typeof FK_ACTIONS)[number];
}

export class CreatePolicyDto {
  @IsString()
  name!: string;

  @IsIn(['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'])
  cmd!: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsString()
  using?: string;

  @IsOptional()
  @IsString()
  withCheck?: string;

  @IsOptional()
  @IsBoolean()
  permissive?: boolean;
}

export class SetRlsDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
