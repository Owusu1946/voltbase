import { createHash } from 'crypto';
import { extname } from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const CF_API = 'https://api.cloudflare.com/client/v4';
const SOFT_CAP_PROJECTS = 95;

/** Pages Direct Upload ignores these as normal assets (uploaded via form fields). */
const SPECIAL_FILES = new Set([
  '_worker.js',
  '_worker.bundle',
  '_routes.json',
  '_headers',
  '_redirects',
]);

type CfResult<T> = {
  success: boolean;
  result: T;
  errors?: { code?: number; message: string }[];
};

export type CfPagesProject = {
  name: string;
  subdomain: string;
  domains?: string[];
  canonical_deployment?: { url?: string } | null;
};

export type CfPagesDeployment = {
  id: string;
  url: string;
  environment: string;
  latest_stage?: { name?: string; status?: string };
  deployment_trigger?: {
    metadata?: { commit_hash?: string; commit_message?: string };
  };
  created_on?: string;
};

type AssetFile = {
  abs: string;
  /** Path relative to output root, forward slashes, no leading slash */
  rel: string;
  hash: string;
  contentType: string;
  size: number;
};

@Injectable()
export class CloudflarePagesClient {
  private readonly logger = new Logger(CloudflarePagesClient.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.accountId() && this.apiToken());
  }

  softCapProjects(): number {
    return SOFT_CAP_PROJECTS;
  }

  hostingRootDomain(): string {
    return (
      this.config.get<string>('HOSTING_ROOT_DOMAIN')?.replace(/\/$/, '') ||
      'apps.voltbase.dev'
    );
  }

  private accountId(): string | undefined {
    const v = this.config.get<string>('CF_ACCOUNT_ID')?.trim();
    return v || undefined;
  }

  private apiToken(): string | undefined {
    const v = this.config.get<string>('CF_API_TOKEN')?.trim();
    return v || undefined;
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        message:
          'Hosting is not configured. Set CF_ACCOUNT_ID and CF_API_TOKEN on the API.',
        code: 'hosting_not_configured',
      });
    }
  }

  private async cfFetch<T>(
    method: string,
    pathname: string,
    body?: BodyInit | null,
    headers?: Record<string, string>,
  ): Promise<T> {
    this.assertConfigured();
    const res = await fetch(`${CF_API}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken()}`,
        ...(body && !(body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...headers,
      },
      body: body ?? undefined,
    });
    const json = (await res.json()) as CfResult<T>;
    if (!res.ok || !json.success) {
      const msg =
        json.errors?.map((e) => e.message).join('; ') ||
        `Cloudflare API ${res.status}`;
      this.logger.warn(`CF Pages API error: ${msg}`);
      throw new BadRequestException({
        message: msg,
        code: 'cloudflare_pages_error',
      });
    }
    return json.result;
  }

  async listProjects(): Promise<CfPagesProject[]> {
    const result = await this.cfFetch<CfPagesProject[]>(
      'GET',
      `/accounts/${this.accountId()}/pages/projects`,
    );
    return result ?? [];
  }

  async projectCount(): Promise<number> {
    const projects = await this.listProjects();
    return projects.length;
  }

  async createProject(name: string, productionBranch = 'main'): Promise<CfPagesProject> {
    return this.cfFetch<CfPagesProject>(
      'POST',
      `/accounts/${this.accountId()}/pages/projects`,
      JSON.stringify({
        name,
        production_branch: productionBranch,
      }),
    );
  }

  async getProject(name: string): Promise<CfPagesProject> {
    return this.cfFetch<CfPagesProject>(
      'GET',
      `/accounts/${this.accountId()}/pages/projects/${encodeURIComponent(name)}`,
    );
  }

  async deleteProject(name: string): Promise<void> {
    await this.cfFetch(
      'DELETE',
      `/accounts/${this.accountId()}/pages/projects/${encodeURIComponent(name)}`,
    );
  }

  async updateProjectEnv(
    name: string,
    envVars: Record<string, string>,
  ): Promise<void> {
    const vars: Record<string, { type: string; value: string }> = {};
    for (const [key, value] of Object.entries(envVars)) {
      vars[key] = { type: 'plain_text', value };
    }
    await this.cfFetch(
      'PATCH',
      `/accounts/${this.accountId()}/pages/projects/${encodeURIComponent(name)}`,
      JSON.stringify({
        deployment_configs: {
          production: { env_vars: vars },
          preview: { env_vars: vars },
        },
      }),
    );
  }

  async listDeployments(projectName: string): Promise<CfPagesDeployment[]> {
    const result = await this.cfFetch<CfPagesDeployment[]>(
      'GET',
      `/accounts/${this.accountId()}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
    );
    return result ?? [];
  }

  async getDeployment(
    projectName: string,
    deploymentId: string,
  ): Promise<CfPagesDeployment> {
    return this.cfFetch<CfPagesDeployment>(
      'GET',
      `/accounts/${this.accountId()}/pages/projects/${encodeURIComponent(projectName)}/deployments/${encodeURIComponent(deploymentId)}`,
    );
  }

  /**
   * Pages Direct Upload. Asset hashes must match Wrangler:
   * sha256(base64(contents) + extension).hex.slice(0, 32)
   */
  async deployDirectory(
    projectName: string,
    directory: string,
    opts?: { branch?: string; commitHash?: string; commitMessage?: string },
  ): Promise<CfPagesDeployment> {
    const { assets, special } = await this.collectDeployFiles(directory);
    if (assets.length === 0 && !special.worker) {
      throw new BadRequestException({
        message: 'Build output directory is empty',
        code: 'empty_build_output',
      });
    }

    const manifest: Record<string, string> = {};
    const byHash = new Map<string, Buffer>();
    for (const file of assets) {
      const buf = await readFile(file.abs);
      manifest[`/${file.rel}`] = file.hash;
      byHash.set(file.hash, buf);
    }

    const fetchJwt = async () => {
      const result = await this.cfFetch<{ jwt: string }>(
        'GET',
        `/accounts/${this.accountId()}/pages/projects/${encodeURIComponent(projectName)}/upload-token`,
      );
      if (!result?.jwt) {
        throw new BadRequestException({
          message: 'Cloudflare did not return an upload JWT',
          code: 'cloudflare_pages_error',
        });
      }
      return result.jwt;
    };

    let jwt = await fetchJwt();

    const withJwt = async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
      try {
        return await fn(jwt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/Authentication failed|Unauthorized|expired/i.test(msg)) {
          jwt = await fetchJwt();
          return fn(jwt);
        }
        throw err;
      }
    };

    const hashes = [...byHash.keys()];
    const missing =
      hashes.length === 0
        ? []
        : await withJwt((token) =>
            this.cfFetch<string[]>(
              'POST',
              `/pages/assets/check-missing`,
              JSON.stringify({ hashes }),
              { Authorization: `Bearer ${token}` },
            ),
          );

    const toUpload = (missing ?? []).filter((h) => byHash.has(h));
    const contentTypeByHash = new Map(
      assets.map((a) => [a.hash, a.contentType] as const),
    );
    const chunkSize = 20;
    for (let i = 0; i < toUpload.length; i += chunkSize) {
      const chunk = toUpload.slice(i, i + chunkSize);
      const payloads = chunk.map((hash) => ({
        key: hash,
        value: byHash.get(hash)!.toString('base64'),
        metadata: {
          contentType:
            contentTypeByHash.get(hash) || 'application/octet-stream',
        },
        base64: true,
      }));
      await withJwt((token) =>
        this.cfFetch(
          'POST',
          `/pages/assets/upload`,
          JSON.stringify(payloads),
          { Authorization: `Bearer ${token}` },
        ),
      );
    }

    if (hashes.length > 0) {
      try {
        await withJwt((token) =>
          this.cfFetch(
            'POST',
            `/pages/assets/upsert-hashes`,
            JSON.stringify({ hashes }),
            { Authorization: `Bearer ${token}` },
          ),
        );
      } catch (err) {
        this.logger.warn(
          `upsert-hashes failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const form = new FormData();
    // Cloudflare expects a plain string field named `manifest` — File/Blob
    // uploads are ignored and JWT auth returns Authentication failed (9106).
    form.append('manifest', JSON.stringify(manifest));
    if (opts?.branch) form.append('branch', opts.branch);
    if (opts?.commitHash) form.append('commit_hash', opts.commitHash);
    if (opts?.commitMessage) {
      form.append('commit_message', opts.commitMessage.slice(0, 200));
    }

    // SvelteKit / adapter-cloudflare Pages Function
    if (special.worker) {
      form.append(
        '_worker.js',
        fileFromBuffer(special.worker, '_worker.js', 'application/javascript+module'),
      );
    }
    if (special.routes) {
      form.append(
        '_routes.json',
        fileFromBuffer(special.routes, '_routes.json', 'application/json'),
      );
    }
    if (special.headers) {
      form.append(
        '_headers',
        fileFromBuffer(special.headers, '_headers', 'text/plain'),
      );
    }
    if (special.redirects) {
      form.append(
        '_redirects',
        fileFromBuffer(special.redirects, '_redirects', 'text/plain'),
      );
    }

    // Final deployment create uses the account API token, not the upload JWT.
    return this.cfFetch<CfPagesDeployment>(
      'POST',
      `/accounts/${this.accountId()}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
      form,
    );
  }

  /**
   * Wrangler-compatible Pages asset hash.
   * @see @cloudflare/deploy-helpers hashFile
   */
  private pagesAssetHash(contents: Buffer, filepath: string): string {
    const base64Contents = contents.toString('base64');
    const extension = extname(filepath).substring(1);
    return createHash('sha256')
      .update(base64Contents + extension)
      .digest('hex')
      .slice(0, 32);
  }

  private async collectDeployFiles(directory: string): Promise<{
    assets: AssetFile[];
    special: {
      worker?: Buffer;
      routes?: Buffer;
      headers?: Buffer;
      redirects?: Buffer;
    };
  }> {
    const assets: AssetFile[] = [];
    const special: {
      worker?: Buffer;
      routes?: Buffer;
      headers?: Buffer;
      redirects?: Buffer;
    } = {};

    const walk = async (dir: string, base = directory) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const abs = path.join(dir, entry.name);
        const rel = path.relative(base, abs).split(path.sep).join('/');

        if (entry.isDirectory()) {
          if (entry.name === 'functions') continue;
          // `_worker.js` as a directory (bundled worker) — treat as special tree root
          if (rel === '_worker.js' || rel.startsWith('_worker.js/')) {
            continue;
          }
          await walk(abs, base);
          continue;
        }
        if (!entry.isFile()) continue;

        const st = await stat(abs);
        if (st.size > 25 * 1024 * 1024) continue;

        const baseName = path.basename(rel);
        if (SPECIAL_FILES.has(baseName) && !rel.includes('/')) {
          const buf = await readFile(abs);
          if (baseName === '_worker.js') special.worker = buf;
          else if (baseName === '_routes.json') special.routes = buf;
          else if (baseName === '_headers') special.headers = buf;
          else if (baseName === '_redirects') special.redirects = buf;
          continue;
        }
        if (SPECIAL_FILES.has(baseName)) continue;

        const buf = await readFile(abs);
        assets.push({
          abs,
          rel,
          hash: this.pagesAssetHash(buf, abs),
          contentType: guessContentType(rel),
          size: st.size,
        });
      }
    };

    await walk(directory);

    // Directory-form `_worker.js` (adapter may emit a folder)
    const workerDir = path.join(directory, '_worker.js');
    try {
      const st = await stat(workerDir);
      if (st.isDirectory() && !special.worker) {
        // Prefer a single entry file if present; otherwise skip (needs bundling).
        for (const name of ['index.js', 'index.mjs', '_worker.js']) {
          try {
            special.worker = await readFile(path.join(workerDir, name));
            break;
          } catch {
            // try next
          }
        }
      }
    } catch {
      // no worker dir
    }

    return { assets, special };
  }
}

function fileFromBuffer(buf: Buffer, name: string, type: string): File {
  // Copy into a plain Uint8Array — Node Buffer's ArrayBufferLike breaks File's BlobPart typing.
  return new File([Uint8Array.from(buf)], name, { type });
}

function guessContentType(relPath: string): string {
  const ext = extname(relPath).toLowerCase();
  const map: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
    '.map': 'application/json',
    '.wasm': 'application/wasm',
  };
  return map[ext] || 'application/octet-stream';
}
