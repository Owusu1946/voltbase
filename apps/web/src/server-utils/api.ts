import { COOKIE_KEYS } from '@voltbase/constants';
import { retrieveTokenFromCookie } from './utils';

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function authCookieHeaders() {
  const token = await retrieveTokenFromCookie();
  return { headers: { Cookie: `${COOKIE_KEYS.ACCESS_TOKEN}=${token}` } };
}

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong') {
  if (
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
  ) {
    return err.response.data.message;
  }
  return fallback;
}
