'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { projectsServerSchema } from './server.schema';
import { PROJECTS_INTENT } from './constants';
import { COOKIE_KEYS } from '@voltbase/constants';
import { retrieveTokenFromCookie } from '@/server-utils/utils';
import apiClient from '@/lib/axios';

export type ProjectsActionState = {
  error?: string;
  success?: string;
};

export async function projectsAction(
  { slug }: { slug: string },
  _prev: ProjectsActionState,
  formData: FormData,
): Promise<ProjectsActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = projectsServerSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Invalid input' };
  }

  const token = await retrieveTokenFromCookie();
  const headers = { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` };
  const { intent } = parsed.data;

  try {
    switch (intent) {
      case PROJECTS_INTENT.CREATE: {
        await apiClient.post(
          `/orgs/${slug}/projects`,
          { name: parsed.data.name },
          { headers },
        );
        revalidatePath(`/organizations/${slug}/projects`);
        return { success: 'Project created!' };
      }
      case PROJECTS_INTENT.UPDATE: {
        await apiClient.patch(
          `/orgs/${slug}/projects/${parsed.data.projectSlug}`,
          { name: parsed.data.name },
          { headers },
        );
        revalidatePath(`/organizations/${slug}/projects`);
        return { success: 'Project renamed' };
      }
      case PROJECTS_INTENT.DELETE: {
        await apiClient.delete(
          `/orgs/${slug}/projects/${parsed.data.projectSlug}`,
          { headers },
        );
        revalidatePath(`/organizations/${slug}/projects`);
        redirect(`/organizations/${slug}/projects`);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
    return { error: err.response?.data?.message ?? 'Something went wrong' };
  }
}
