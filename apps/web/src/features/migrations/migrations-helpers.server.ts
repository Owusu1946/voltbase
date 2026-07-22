import { redirect } from 'next/navigation';
import apiClient from '@/lib/axios';
import { authCookieHeaders } from '@/server-utils/api';
import type { ProjectMigration } from '@voltbase/types';

export async function retrieveMigrationsFromApi(
  orgSlug: string,
  projectSlug: string,
): Promise<ProjectMigration[]> {
  try {
    const { data } = await apiClient.get<ProjectMigration[]>(
      `/orgs/${orgSlug}/projects/${projectSlug}/migrations`,
      await authCookieHeaders(),
    );
    return data;
  } catch {
    redirect(`/organizations/${orgSlug}/projects`);
  }
}
