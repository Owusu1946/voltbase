import { z } from 'zod';
import { PROJECTS_INTENT } from './constants';
import { createProjectSchema } from './client.schema';

export const projectsServerSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal(PROJECTS_INTENT.CREATE),
    ...createProjectSchema.shape,
  }),
  z.object({
    intent: z.literal(PROJECTS_INTENT.UPDATE),
    projectSlug: z.string().min(1),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be at most 50 characters'),
  }),
  z.object({
    intent: z.literal(PROJECTS_INTENT.DELETE),
    projectSlug: z.string().min(1),
    confirm: z.literal('DELETE'),
  }),
]);
