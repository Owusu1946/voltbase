'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';
import type { ProjectMigration } from '@voltbase/types';

export type MigrationActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function migrationsBase(orgSlug: string, projectSlug: string) {
  return `/orgs/${orgSlug}/projects/${projectSlug}/migrations`;
}

export async function applyMigrationAction(
  orgSlug: string,
  projectSlug: string,
  input: { name: string; sql: string },
): Promise<MigrationActionResult<ProjectMigration>> {
  try {
    const { data } = await apiClient.post<ProjectMigration>(
      migrationsBase(orgSlug, projectSlug),
      input,
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to apply migration'),
    };
  }
}

export async function getMigrationAction(
  orgSlug: string,
  projectSlug: string,
  id: string,
): Promise<MigrationActionResult<ProjectMigration>> {
  try {
    const { data } = await apiClient.get<ProjectMigration>(
      `${migrationsBase(orgSlug, projectSlug)}/${id}`,
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to load migration'),
    };
  }
}
