'use server';

import { COOKIE_KEYS } from '@voltbase/constants';
import type { QueryResult } from '@voltbase/types';
import apiClient from '@/lib/axios';
import { retrieveTokenFromCookie } from '@/server-utils/utils';

export type ExecuteSqlResult =
  | { ok: true; data: QueryResult }
  | { ok: false; error: string };

export async function executeSqlAction(
  orgSlug: string,
  projectSlug: string,
  sql: string,
): Promise<ExecuteSqlResult> {
  const token = await retrieveTokenFromCookie();

  try {
    const { data } = await apiClient.post<QueryResult>(
      `/orgs/${orgSlug}/projects/${projectSlug}/sql`,
      { sql },
      { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } },
    );
    return { ok: true, data };
  } catch (err: unknown) {
    const message =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      err.response &&
      typeof err.response === 'object' &&
      'data' in err.response &&
      err.response.data &&
      typeof err.response.data === 'object' &&
      'message' in err.response.data &&
      typeof err.response.data.message === 'string'
        ? err.response.data.message
        : 'Query failed';
    return { ok: false, error: message };
  }
}
