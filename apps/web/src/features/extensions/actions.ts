'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';

export type ExtensionInfo = {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  version: string | null;
};

export async function listExtensionsAction(
  orgSlug: string,
  projectSlug: string,
): Promise<
  { ok: true; extensions: ExtensionInfo[] } | { ok: false; error: string }
> {
  try {
    const { data } = await apiClient.get<{ extensions: ExtensionInfo[] }>(
      `/orgs/${orgSlug}/projects/${projectSlug}/extensions`,
      await authCookieHeaders(),
    );
    return { ok: true, extensions: data.extensions };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to load extensions'),
    };
  }
}

export async function enableVectorExtensionAction(
  orgSlug: string,
  projectSlug: string,
): Promise<
  { ok: true; extension: ExtensionInfo } | { ok: false; error: string }
> {
  try {
    const { data } = await apiClient.post<ExtensionInfo>(
      `/orgs/${orgSlug}/projects/${projectSlug}/extensions/vector/enable`,
      {},
      await authCookieHeaders(),
    );
    return { ok: true, extension: data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to enable pgvector'),
    };
  }
}
