import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { COLUMN_TYPES } from '@voltbase/constants';
import type { ColumnType } from '@voltbase/types';

export class AddColumnDto {
  @IsString()
  name!: string;

  @IsIn(COLUMN_TYPES)
  type!: ColumnType;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsBoolean()
  unique?: boolean;

  @IsOptional()
  @IsString()
  foreignKeyTable?: string;

  @IsOptional()
  @IsString()
  foreignKeyColumn?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  @Type(() => Number)
  vectorDimensions?: number;
}
