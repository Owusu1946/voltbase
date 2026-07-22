'use server';

import apiClient from '@/lib/axios';
import { authCookieHeaders, getApiErrorMessage } from '@/server-utils/api';

export type HostingFrameworkPreset = {
  id: string;
  label: string;
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  envPrefix: string;
  supportsDeploy: boolean;
  warning?: string;
};

export type HostingDeployment = {
  id: string;
  status: string;
  stage: string;
  url: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  environment: string;
  errorMessage: string | null;
  logs: Record<string, string>;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type HostingEnvVar = {
  id: string;
  key: string;
  value: string | null;
  isSecret: boolean;
  isSystem: boolean;
  hasValue: boolean;
};

export type HostingSite = {
  id: string;
  githubOwner: string;
  githubRepo: string;
  fullName: string;
  branch: string;
  rootDirectory: string;
  framework: string;
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  productionUrl: string | null;
  pagesDevUrl: string | null;
  status: string;
  lastDeployStatus: string | null;
  lastCommitSha: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type HostingStatus = {
  configured: boolean;
  githubConnected: boolean;
  githubLogin: string | null;
  githubOAuthConfigured: boolean;
  nearCap: boolean;
  projectCount: number | null;
  softCap: number;
  rootDomain: string;
  site: HostingSite | null;
  env: HostingEnvVar[];
  deployments: HostingDeployment[];
};

export type GithubRepo = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  description: string | null;
};

function base(orgSlug: string, projectSlug: string) {
  return `/orgs/${orgSlug}/projects/${projectSlug}/hosting`;
}

export async function getHostingStatusAction(
  orgSlug: string,
  projectSlug: string,
): Promise<{ ok: true; data: HostingStatus } | { ok: false; error: string }> {
  try {
    const { data } = await apiClient.get<HostingStatus>(
      base(orgSlug, projectSlug),
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to load hosting'),
    };
  }
}

export async function connectGithubAction(
  orgSlug: string,
  projectSlug: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { data } = await apiClient.get<{ url: string }>(
      `${base(orgSlug, projectSlug)}/github/connect`,
      await authCookieHeaders(),
    );
    return { ok: true, url: data.url };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to start GitHub connect'),
    };
  }
}

export async function disconnectGithubAction(
  orgSlug: string,
  projectSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiClient.delete(
      `${base(orgSlug, projectSlug)}/github`,
      await authCookieHeaders(),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to disconnect GitHub'),
    };
  }
}

export async function listReposAction(
  orgSlug: string,
  projectSlug: string,
  q?: string,
): Promise<
  | {
      ok: true;
      repos: GithubRepo[];
      orgs: { login: string; avatarUrl: string }[];
      login: string;
    }
  | { ok: false; error: string }
> {
  try {
    const { data } = await apiClient.get<{
      repos: GithubRepo[];
      orgs: { login: string; avatarUrl: string }[];
      login: string;
    }>(`${base(orgSlug, projectSlug)}/repos`, {
      ...(await authCookieHeaders()),
      params: q ? { q } : undefined,
    });
    return { ok: true, ...data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to list repositories'),
    };
  }
}

export async function detectFrameworkAction(
  orgSlug: string,
  projectSlug: string,
  body: {
    owner: string;
    repo: string;
    branch?: string;
    rootDirectory?: string;
  },
): Promise<
  | {
      ok: true;
      preset: HostingFrameworkPreset;
      packageJsonFound: boolean;
    }
  | { ok: false; error: string }
> {
  try {
    const { data } = await apiClient.post<{
      preset: HostingFrameworkPreset;
      packageJsonFound: boolean;
    }>(`${base(orgSlug, projectSlug)}/detect`, body, await authCookieHeaders());
    return { ok: true, ...data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to detect framework'),
    };
  }
}

export async function importSiteAction(
  orgSlug: string,
  projectSlug: string,
  body: {
    owner: string;
    repo: string;
    repoId?: string;
    branch?: string;
    rootDirectory?: string;
    framework?: string;
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
    env?: { key: string; value: string; isSecret?: boolean }[];
  },
): Promise<{ ok: true; data: HostingStatus } | { ok: false; error: string }> {
  try {
    const { data } = await apiClient.post<HostingStatus>(
      `${base(orgSlug, projectSlug)}/import`,
      body,
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to import repository'),
    };
  }
}

export async function redeployAction(
  orgSlug: string,
  projectSlug: string,
): Promise<{ ok: true; data: HostingStatus } | { ok: false; error: string }> {
  try {
    const { data } = await apiClient.post<HostingStatus>(
      `${base(orgSlug, projectSlug)}/redeploy`,
      {},
      await authCookieHeaders(),
    );
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to redeploy'),
    };
  }
}

export async function disconnectSiteAction(
  orgSlug: string,
  projectSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiClient.delete(base(orgSlug, projectSlug), await authCookieHeaders());
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to disconnect site'),
    };
  }
}

export async function upsertHostingEnvAction(
  orgSlug: string,
  projectSlug: string,
  vars: { key: string; value: string; isSecret?: boolean }[],
): Promise<
  | { ok: true; env: HostingEnvVar[] }
  | { ok: false; error: string }
> {
  try {
    const { data } = await apiClient.post<{ env: HostingEnvVar[] }>(
      `${base(orgSlug, projectSlug)}/env`,
      { vars },
      await authCookieHeaders(),
    );
    return { ok: true, env: data.env };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to save environment variables'),
    };
  }
}

export async function deleteHostingEnvAction(
  orgSlug: string,
  projectSlug: string,
  key: string,
): Promise<
  | { ok: true; env: HostingEnvVar[] }
  | { ok: false; error: string }
> {
  try {
    const { data } = await apiClient.delete<{ env: HostingEnvVar[] }>(
      `${base(orgSlug, projectSlug)}/env/${encodeURIComponent(key)}`,
      await authCookieHeaders(),
    );
    return { ok: true, env: data.env };
  } catch (err) {
    return {
      ok: false,
      error: getApiErrorMessage(err, 'Failed to delete environment variable'),
    };
  }
}
