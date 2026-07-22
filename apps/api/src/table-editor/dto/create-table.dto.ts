import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { COLUMN_TYPES } from '@voltbase/constants';
import type {
  CreateTableInput,
  CreateColumnInput,
  ColumnType,
} from '@voltbase/types';

export class CreateColumnDto implements CreateColumnInput {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(COLUMN_TYPES)
  type!: ColumnType;

  @IsBoolean()
  isNullable!: boolean;

  @IsBoolean()
  isPrimaryKey!: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsBoolean()
  @IsOptional()
  unique?: boolean;

  @IsString()
  @IsOptional()
  foreignKeyTable?: string;

  @IsString()
  @IsOptional()
  foreignKeyColumn?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  @Type(() => Number)
  vectorDimensions?: number;
}

export class CreateTableDto implements CreateTableInput {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateColumnDto)
  columns!: CreateColumnDto[];
}
