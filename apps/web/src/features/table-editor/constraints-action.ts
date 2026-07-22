'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';

type Result = { ok: true } | { ok: false; error: string };

function base(orgSlug: string, projectSlug: string, table: string) {
  return `/orgs/${orgSlug}/projects/${projectSlug}/tables/${table}`;
}

export async function createIndexAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  body: {
    name?: string;
    columns: string[];
    unique?: boolean;
    method?: string;
    ops?: string;
  },
): Promise<Result> {
  try {
    await apiClient.post(
      `${base(orgSlug, projectSlug, tableName)}/indexes`,
      body,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to create index') };
  }
}

export async function dropIndexAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  indexName: string,
): Promise<Result> {
  try {
    await apiClient.delete(
      `${base(orgSlug, projectSlug, tableName)}/indexes/${indexName}`,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to drop index') };
  }
}

export async function createUniqueAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  body: { name?: string; columns: string[] },
): Promise<Result> {
  try {
    await apiClient.post(
      `${base(orgSlug, projectSlug, tableName)}/constraints/unique`,
      body,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to create unique constraint'),
    };
  }
}

export async function dropConstraintAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  constraintName: string,
): Promise<Result> {
  try {
    await apiClient.delete(
      `${base(orgSlug, projectSlug, tableName)}/constraints/${constraintName}`,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to drop constraint'),
    };
  }
}

export async function createForeignKeyAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  body: {
    name?: string;
    columns: string[];
    refTable: string;
    refColumns: string[];
    onDelete?: string;
    onUpdate?: string;
  },
): Promise<Result> {
  try {
    await apiClient.post(
      `${base(orgSlug, projectSlug, tableName)}/foreign-keys`,
      body,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to create foreign key'),
    };
  }
}

export async function setRlsAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  enabled: boolean,
  force?: boolean,
): Promise<Result> {
  try {
    await apiClient.post(
      `${base(orgSlug, projectSlug, tableName)}/rls`,
      { enabled, force },
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getApiErrorMessage(err, 'Failed to update RLS') };
  }
}

export async function createPolicyAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  body: {
    name: string;
    cmd: string;
    roles?: string[];
    using?: string;
    withCheck?: string;
  },
): Promise<Result> {
  try {
    await apiClient.post(
      `${base(orgSlug, projectSlug, tableName)}/policies`,
      body,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to create policy'),
    };
  }
}

export async function dropPolicyAction(
  orgSlug: string,
  projectSlug: string,
  tableName: string,
  policyName: string,
): Promise<Result> {
  try {
    await apiClient.delete(
      `${base(orgSlug, projectSlug, tableName)}/policies/${policyName}`,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to drop policy'),
    };
  }
}
