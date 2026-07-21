import { z } from 'zod';
import { ORGANIZATION_INTENT } from './constants';
import { createOrgSchema } from './client.schema';

export const organizationServerSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal(ORGANIZATION_INTENT.CREATE),
    ...createOrgSchema.shape,
  }),
  z.object({
    intent: z.literal(ORGANIZATION_INTENT.UPDATE),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
  z.object({
    intent: z.literal(ORGANIZATION_INTENT.DELETE),
    confirm: z.literal('DELETE'),
  }),
]);
