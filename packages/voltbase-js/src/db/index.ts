import { QueryBuilder, type GetUserToken, type QueryResult } from './query-builder';

export class VoltbaseDb {
  constructor(
    private projectUrl: string,
    private apiKey: string,
    private getUserToken?: GetUserToken,
  ) {}

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(
      this.projectUrl,
      table,
      this.apiKey,
      this.getUserToken,
    );
  }

  async rpc<T = unknown>(
    fn: string,
    args: Record<string, unknown> = {},
  ): Promise<QueryResult<T>> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };
      const token = this.getUserToken?.();
      if (token) headers['X-User-Jwt'] = token;

      const res = await fetch(`${this.projectUrl}/rest/rpc/${encodeURIComponent(fn)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        return { data: null, error: err.message ?? `HTTP ${res.status}` };
      }

      if (res.status === 204) return { data: null, error: null };

      const data = (await res.json()) as T;
      return { data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { data: null, error: message };
    }
  }
}

export { QueryBuilder } from './query-builder';
export type { QueryResult, GetUserToken } from './query-builder';
