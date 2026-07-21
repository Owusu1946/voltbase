'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';
import { PROJECT_KEY_ROLES } from '@voltbase/constants';

export type RotateKeyResult =
  | { ok: true; data: { role: string; key: string; version: number } }
  | { ok: false; error: string };

export async function rotateProjectKeyAction(
  orgSlug: string,
  projectSlug: string,
  role: typeof PROJECT_KEY_ROLES.ANON | typeof PROJECT_KEY_ROLES.SERVICE_ROLE,
): Promise<RotateKeyResult> {
  try {
    const { data } = await apiClient.post<{
      role: string;
      key: string;
      version: number;
    }>(
      `/orgs/${orgSlug}/projects/${projectSlug}/keys/rotate`,
      { role },
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to rotate key') };
  }
}
