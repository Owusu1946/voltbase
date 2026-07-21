'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';

export type RealtimeActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function enableRealtimeTableAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
): Promise<RealtimeActionResult> {
  try {
    await apiClient.post(
      `/orgs/${orgSlug}/projects/${projectSlug}/realtime/${tableName}/enable`,
      {},
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to enable realtime') };
  }
}

export async function disableRealtimeTableAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
): Promise<RealtimeActionResult> {
  try {
    await apiClient.delete(
      `/orgs/${orgSlug}/projects/${projectSlug}/realtime/${tableName}/disable`,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to disable realtime'),
    };
  }
}
