import { z } from 'zod';
import { COLUMN_TYPES, DEFAULT_VECTOR_DIMENSIONS } from '@voltbase/constants';
import type { CreateTableInput } from '@voltbase/types';

export const createColumnSchema = z.object({
  name: z.string().min(1, 'Required'),
  type: z.enum(COLUMN_TYPES),
  isNullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  defaultValue: z.string().optional(),
  foreignKeyTable: z.string().optional(),
  foreignKeyColumn: z.string().optional(),
  // Use z.number (not coerce) so RHF + zodResolver stay typed as number | undefined
  vectorDimensions: z.number().int().min(1).max(2000).optional(),
});

export const createTableSchema = z.object({
  name: z.string().min(1, 'Table name is required'),
  columns: z.array(createColumnSchema).min(1, 'At least one column required'),
}) satisfies z.ZodType<CreateTableInput>;

export const fetchTableSchema = z.object({
  tableName: z.string().min(1),
});

export const deleteTableSchema = z.object({
  tableName: z.string().min(1),
});

export const addColumnSchema = z.object({
  tableName: z.string().min(1),
  name: z
    .string()
    .min(1, 'Column name is required')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid column name'),
  type: z.enum(COLUMN_TYPES),
  defaultValue: z.string().optional(),
  vectorDimensions: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return DEFAULT_VECTOR_DIMENSIONS;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : DEFAULT_VECTOR_DIMENSIONS;
    })
    .pipe(z.number().int().min(1).max(2000)),
});

export const insertRowSchema = z.object({
  tableName: z.string().min(1),
  values: z.string().min(1),
});

export const deleteRowSchema = z.object({
  tableName: z.string().min(1),
  pkColumn: z.string().min(1),
  pkValue: z.string().min(1),
});
