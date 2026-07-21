'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { COOKIE_KEYS } from '@voltbase/constants';
import apiClient from '@/lib/axios';
import { retrieveTokenFromCookie } from '@/server-utils/utils';
import { ORGANIZATION_INTENT } from './constants';
import { organizationServerSchema } from './server.schema';

export type OrganizationActionState = {
  error?: string;
  success?: string;
};

export async function organizationAction(
  _prev: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = organizationServerSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Invalid input' };
  }

  const token = await retrieveTokenFromCookie();
  const headers = { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` };
  const { intent } = parsed.data;

  try {
    switch (intent) {
      case ORGANIZATION_INTENT.CREATE: {
        const { data } = await apiClient.post<{ slug: string }>(
          '/orgs',
          { name: parsed.data.name },
          { headers },
        );
        revalidatePath('/organizations');
        redirect(`/organizations/${data.slug}/projects`);
      }
      case ORGANIZATION_INTENT.UPDATE: {
        const slug = String(formData.get('slug') ?? '');
        if (!slug) return { error: 'Missing organization' };
        await apiClient.patch(`/orgs/${slug}`, { name: parsed.data.name }, { headers });
        revalidatePath(`/organizations/${slug}`);
        revalidatePath('/organizations');
        return { success: 'Organization renamed' };
      }
      case ORGANIZATION_INTENT.DELETE: {
        const slug = String(formData.get('slug') ?? '');
        if (!slug) return { error: 'Missing organization' };
        await apiClient.delete(`/orgs/${slug}`, { headers });
        revalidatePath('/organizations');
        redirect('/organizations');
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
    return { error: err.response?.data?.message ?? 'Something went wrong' };
  }
}
