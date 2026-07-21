import { z } from 'zod';
import {
  addColumnSchema,
  createTableSchema,
  deleteTableSchema,
  fetchTableSchema,
  insertRowSchema,
  deleteRowSchema,
} from './client.schema';
import { TABLE_EDITOR_INTENT } from '@voltbase/constants';

export const tableEditorServerSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal(TABLE_EDITOR_INTENT.CREATE_TABLE),
    name: createTableSchema.shape.name,
    columns: z.string().transform((raw, ctx) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        const result = createTableSchema.shape.columns.safeParse(parsed);
        if (!result.success) {
          ctx.addIssue({ code: 'custom', message: 'Invalid columns' });
          return z.NEVER;
        }
        return result.data;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid columns JSON' });
        return z.NEVER;
      }
    }),
  }),
  z.object({
    intent: z.literal(TABLE_EDITOR_INTENT.DELETE_TABLE),
    ...deleteTableSchema.shape,
  }),
  z.object({
    intent: z.literal(TABLE_EDITOR_INTENT.FETCH_TABLE),
    ...fetchTableSchema.shape,
  }),
  z.object({
    intent: z.literal(TABLE_EDITOR_INTENT.ADD_COLUMN),
    ...addColumnSchema.shape,
  }),
  z.object({
    intent: z.literal(TABLE_EDITOR_INTENT.INSERT_ROW),
    tableName: insertRowSchema.shape.tableName,
    values: z.string().transform((raw, ctx) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          ctx.addIssue({ code: 'custom', message: 'Invalid row values' });
          return z.NEVER;
        }
        return parsed as Record<string, unknown>;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid row JSON' });
        return z.NEVER;
      }
    }),
  }),
  z.object({
    intent: z.literal(TABLE_EDITOR_INTENT.DELETE_ROW),
    ...deleteRowSchema.shape,
  }),
]);
