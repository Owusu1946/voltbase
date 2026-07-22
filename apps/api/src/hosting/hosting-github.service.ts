import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { hostingGithubConnections } from '../db/schema';

export type GithubRepoSummary = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  description: string | null;
};

@Injectable()
export class HostingGithubService {
  constructor(
    private drizzle: DrizzleService,
    private config: ConfigService,
  ) {}

  private clientId(): string {
    return (
      this.config.get<string>('HOSTING_GITHUB_CLIENT_ID') ||
      this.config.get<string>('GITHUB_CLIENT_ID') ||
      ''
    );
  }

  private clientSecret(): string {
    return (
      this.config.get<string>('HOSTING_GITHUB_CLIENT_SECRET') ||
      this.config.get<string>('GITHUB_CLIENT_SECRET') ||
      ''
    );
  }

  private callbackUrl(): string {
    const apiUrl = this.config.get<string>('API_URL')?.replace(/\/$/, '');
    return (
      this.config.get<string>('HOSTING_GITHUB_CALLBACK_URL') ||
      `${apiUrl}/hosting/github/callback`
    );
  }

  isOAuthConfigured(): boolean {
    return Boolean(this.clientId() && this.clientSecret());
  }

  buildAuthorizeUrl(state: string): string {
    if (!this.isOAuthConfigured()) {
      throw new BadRequestException({
        message: 'GitHub OAuth is not configured for Hosting',
        code: 'github_oauth_not_configured',
      });
    }
    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.callbackUrl(),
      scope: 'repo read:user read:org',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    scope: string;
    login: string;
    githubUserId: string;
  }> {
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId(),
          client_secret: this.clientSecret(),
          code,
          redirect_uri: this.callbackUrl(),
        }),
      },
    );
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenJson.access_token) {
      throw new UnauthorizedException(
        tokenJson.error_description || tokenJson.error || 'GitHub OAuth failed',
      );
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'voltbase-hosting',
      },
    });
    const user = (await userRes.json()) as { id: number; login: string };
    return {
      accessToken: tokenJson.access_token,
      scope: tokenJson.scope || '',
      login: user.login,
      githubUserId: String(user.id),
    };
  }

  async upsertConnection(
    userId: string,
    data: {
      accessToken: string;
      scope: string;
      login: string;
      githubUserId: string;
    },
  ) {
    const existing = await this.drizzle.db
      .select()
      .from(hostingGithubConnections)
      .where(eq(hostingGithubConnections.userId, userId))
      .limit(1);

    if (existing[0]) {
      await this.drizzle.db
        .update(hostingGithubConnections)
        .set({
          accessToken: data.accessToken,
          scope: data.scope,
          githubLogin: data.login,
          githubUserId: data.githubUserId,
          updatedAt: new Date(),
        })
        .where(eq(hostingGithubConnections.userId, userId));
    } else {
      await this.drizzle.db.insert(hostingGithubConnections).values({
        userId,
        accessToken: data.accessToken,
        scope: data.scope,
        githubLogin: data.login,
        githubUserId: data.githubUserId,
      });
    }
  }

  async getConnection(userId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(hostingGithubConnections)
      .where(eq(hostingGithubConnections.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async disconnect(userId: string) {
    await this.drizzle.db
      .delete(hostingGithubConnections)
      .where(eq(hostingGithubConnections.userId, userId));
  }

  private async gh<T>(
    token: string,
    pathname: string,
    init?: RequestInit,
  ): Promise<T> {
    const res = await fetch(`https://api.github.com${pathname}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'voltbase-hosting',
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException({
        message: `GitHub API error: ${res.status} ${text.slice(0, 200)}`,
        code: 'github_api_error',
      });
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async listRepos(
    token: string,
    opts?: { q?: string; perPage?: number },
  ): Promise<GithubRepoSummary[]> {
    const perPage = opts?.perPage ?? 50;
    const q = opts?.q?.trim();

    const repos = await this.gh<
      {
        id: number;
        full_name: string;
        name: string;
        owner: { login: string };
        private: boolean;
        default_branch: string;
        updated_at: string;
        description: string | null;
      }[]
    >(
      token,
      `/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`,
    );

    const mapped = repos.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      owner: r.owner.login,
      private: r.private,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
      description: r.description,
    }));

    if (!q) return mapped.slice(0, perPage);
    return mapped
      .filter(
        (r) =>
          r.fullName.toLowerCase().includes(q.toLowerCase()) ||
          r.name.toLowerCase().includes(q.toLowerCase()),
      )
      .slice(0, perPage);
  }

  async listOrgs(token: string): Promise<{ login: string; avatarUrl: string }[]> {
    const orgs = await this.gh<{ login: string; avatar_url: string }[]>(
      token,
      '/user/orgs?per_page=100',
    );
    return orgs.map((o) => ({ login: o.login, avatarUrl: o.avatar_url }));
  }

  async getFileContent(
    token: string,
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<string | null> {
    try {
      const data = await this.gh<{ content?: string; encoding?: string }>(
        token,
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
      );
      if (!data.content) return null;
      return Buffer.from(data.content, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }

  async getTarballUrl(
    token: string,
    owner: string,
    repo: string,
    ref: string,
  ): Promise<{ url: string; commitSha: string; commitMessage: string }> {
    const commit = await this.gh<{
      sha: string;
      commit: { message: string };
    }>(token, `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`);

    return {
      url: `https://api.github.com/repos/${owner}/${repo}/tarball/${encodeURIComponent(ref)}`,
      commitSha: commit.sha,
      commitMessage: commit.commit.message.split('\n')[0] ?? '',
      // token passed separately for download
    };
  }

  async downloadTarball(
    token: string,
    owner: string,
    repo: string,
    ref: string,
  ): Promise<{ buffer: Buffer; commitSha: string; commitMessage: string }> {
    const meta = await this.getTarballUrl(token, owner, repo, ref);
    const res = await fetch(meta.url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'voltbase-hosting',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new BadRequestException({
        message: `Failed to download repository archive (${res.status})`,
        code: 'github_tarball_failed',
      });
    }
    const ab = await res.arrayBuffer();
    return {
      buffer: Buffer.from(ab),
      commitSha: meta.commitSha,
      commitMessage: meta.commitMessage,
    };
  }
}
