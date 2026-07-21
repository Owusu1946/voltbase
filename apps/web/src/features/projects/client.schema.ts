import { z } from 'zod';
import type { CreateProjectInput } from '@voltbase/types';

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
}) satisfies z.ZodType<CreateProjectInput>;
