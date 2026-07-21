'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';
import type { ProjectOAuthSettings } from '@voltbase/types';

export type SaveAuthSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveAuthSettingsAction(
  orgSlug: string,
  projectSlug: string,
  settings: ProjectOAuthSettings,
): Promise<SaveAuthSettingsResult> {
  try {
    await apiClient.post(
      `/orgs/${orgSlug}/projects/${projectSlug}/auth/settings`,
      settings,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Save failed') };
  }
}
