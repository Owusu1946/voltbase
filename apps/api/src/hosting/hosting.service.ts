import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  mkdtemp,
  rm,
  writeFile,
  mkdir,
  readdir,
  readFile,
  access,
  constants as fsConstants,
} from 'fs/promises';
import os from 'os';
import path from 'path';
import { DrizzleService } from '../db/drizzle.service';
import {
  hostedDeployments,
  hostedSiteEnv,
  hostedSites,
  organizations,
  projects,
} from '../db/schema';
import { CloudflarePagesClient } from './cloudflare-pages.client';
import {
  detectFramework,
  FRAMEWORK_PRESETS,
  type HostingFrameworkId,
  voltbaseEnvForFramework,
} from './framework-detect';
import { HostingGithubService } from './hosting-github.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class HostingService {
  private readonly logger = new Logger(HostingService.name);
  private readonly deploying = new Set<string>();

  constructor(
    private drizzle: DrizzleService,
    private cf: CloudflarePagesClient,
    private github: HostingGithubService,
  ) {}

  private async getProject(orgSlug: string, projectSlug: string) {
    const [row] = await this.drizzle.db
      .select({
        id: projects.id,
        slug: projects.slug,
        projectUrl: projects.projectUrl,
        anonKey: projects.anonKey,
      })
      .from(projects)
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(
        and(eq(organizations.slug, orgSlug), eq(projects.slug, projectSlug)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Project not found');
    return row;
  }

  async getStatus(orgSlug: string, projectSlug: string, userId: string) {
    const project = await this.getProject(orgSlug, projectSlug);
    const gh = await this.github.getConnection(userId);
    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);

    let projectCount: number | null = null;
    let nearCap = false;
    if (this.cf.isConfigured()) {
      try {
        projectCount = await this.cf.projectCount();
        nearCap = projectCount >= this.cf.softCapProjects();
      } catch {
        projectCount = null;
      }
    }

    const deployments = site
      ? await this.drizzle.db
          .select()
          .from(hostedDeployments)
          .where(eq(hostedDeployments.hostedSiteId, site.id))
          .orderBy(desc(hostedDeployments.createdAt))
          .limit(20)
      : [];

    const envRows = site
      ? await this.drizzle.db
          .select()
          .from(hostedSiteEnv)
          .where(eq(hostedSiteEnv.hostedSiteId, site.id))
      : [];

    return {
      configured: this.cf.isConfigured(),
      githubConnected: Boolean(gh),
      githubLogin: gh?.githubLogin ?? null,
      githubOAuthConfigured: this.github.isOAuthConfigured(),
      nearCap,
      projectCount,
      softCap: this.cf.softCapProjects(),
      rootDomain: this.cf.hostingRootDomain(),
      site: site
        ? {
            id: site.id,
            githubOwner: site.githubOwner,
            githubRepo: site.githubRepo,
            fullName: `${site.githubOwner}/${site.githubRepo}`,
            branch: site.branch,
            rootDirectory: site.rootDirectory,
            framework: site.framework,
            buildCommand: site.buildCommand,
            outputDirectory: site.outputDirectory,
            installCommand: site.installCommand,
            productionUrl: site.productionUrl,
            pagesDevUrl: site.pagesDevUrl
              ? this.pagesDevHttpsUrl(site.pagesDevUrl)
              : null,
            status: site.status,
            lastDeployStatus: site.lastDeployStatus,
            lastCommitSha: site.lastCommitSha,
            lastError: site.lastError,
            updatedAt: site.updatedAt,
          }
        : null,
      env: envRows.map((e) => ({
        id: e.id,
        key: e.key,
        value: e.value,
        isSecret: e.isSecret,
        isSystem: e.isSystem,
        hasValue: Boolean(e.value),
      })),
      deployments: deployments.map((d) => ({
        id: d.id,
        status: d.status,
        stage: d.stage,
        url: d.url,
        commitSha: d.commitSha,
        commitMessage: d.commitMessage,
        environment: d.environment,
        errorMessage: d.errorMessage,
        logs: parseDeployLogs(d.logs),
        durationMs: d.durationMs,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    };
  }

  async listEnv(orgSlug: string, projectSlug: string) {
    const project = await this.getProject(orgSlug, projectSlug);
    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);
    if (!site) throw new NotFoundException('No hosted site');
    const rows = await this.drizzle.db
      .select()
      .from(hostedSiteEnv)
      .where(eq(hostedSiteEnv.hostedSiteId, site.id));
    return {
      env: rows.map((e) => ({
        id: e.id,
        key: e.key,
        value: e.value,
        isSecret: e.isSecret,
        isSystem: e.isSystem,
        hasValue: Boolean(e.value),
      })),
    };
  }

  async upsertEnv(
    orgSlug: string,
    projectSlug: string,
    body: {
      vars: { key: string; value: string; isSecret?: boolean }[];
      replace?: boolean;
    },
  ) {
    const project = await this.getProject(orgSlug, projectSlug);
    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);
    if (!site) throw new NotFoundException('No hosted site');

    const cleaned = body.vars
      .map((v) => ({
        key: v.key.trim(),
        value: v.value,
        isSecret: Boolean(v.isSecret) || /SECRET|TOKEN|KEY|PASSWORD/i.test(v.key),
      }))
      .filter((v) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(v.key));

    if (body.replace) {
      await this.drizzle.db
        .delete(hostedSiteEnv)
        .where(
          and(
            eq(hostedSiteEnv.hostedSiteId, site.id),
            eq(hostedSiteEnv.isSystem, false),
          ),
        );
    }

    for (const v of cleaned) {
      const [existing] = await this.drizzle.db
        .select()
        .from(hostedSiteEnv)
        .where(
          and(
            eq(hostedSiteEnv.hostedSiteId, site.id),
            eq(hostedSiteEnv.key, v.key),
          ),
        )
        .limit(1);
      if (existing?.isSystem) continue;
      if (existing) {
        // Empty value on secret means keep previous
        const nextValue =
          existing.isSecret && v.value === '' ? existing.value : v.value;
        await this.drizzle.db
          .update(hostedSiteEnv)
          .set({
            value: nextValue,
            isSecret: v.isSecret || existing.isSecret,
          })
          .where(eq(hostedSiteEnv.id, existing.id));
      } else {
        await this.drizzle.db.insert(hostedSiteEnv).values({
          hostedSiteId: site.id,
          key: v.key,
          value: v.value,
          isSecret: v.isSecret,
          isSystem: false,
        });
      }
    }

    await this.syncEnvToCloudflare(site.id, site.cfPagesProjectName);
    return this.listEnv(orgSlug, projectSlug);
  }

  async deleteEnv(orgSlug: string, projectSlug: string, key: string) {
    const project = await this.getProject(orgSlug, projectSlug);
    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);
    if (!site) throw new NotFoundException('No hosted site');
    const [row] = await this.drizzle.db
      .select()
      .from(hostedSiteEnv)
      .where(
        and(
          eq(hostedSiteEnv.hostedSiteId, site.id),
          eq(hostedSiteEnv.key, key),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Env var not found');
    if (row.isSystem) {
      throw new BadRequestException({
        message: 'System environment variables cannot be deleted',
        code: 'system_env',
      });
    }
    await this.drizzle.db
      .delete(hostedSiteEnv)
      .where(eq(hostedSiteEnv.id, row.id));
    await this.syncEnvToCloudflare(site.id, site.cfPagesProjectName);
    return this.listEnv(orgSlug, projectSlug);
  }

  private async syncEnvToCloudflare(siteId: string, cfProjectName: string) {
    if (!this.cf.isConfigured()) return;
    const rows = await this.drizzle.db
      .select()
      .from(hostedSiteEnv)
      .where(eq(hostedSiteEnv.hostedSiteId, siteId));
    const vars: Record<string, string> = {};
    for (const r of rows) vars[r.key] = r.value;
    try {
      await this.cf.updateProjectEnv(cfProjectName, vars);
    } catch (err) {
      this.logger.warn(`Failed to sync Pages env: ${String(err)}`);
    }
  }

  async listGithubRepos(userId: string, q?: string) {
    const gh = await this.github.getConnection(userId);
    if (!gh) {
      throw new BadRequestException({
        message: 'Connect GitHub first',
        code: 'github_not_connected',
      });
    }
    const [repos, orgs] = await Promise.all([
      this.github.listRepos(gh.accessToken, { q }),
      this.github.listOrgs(gh.accessToken),
    ]);
    return { repos, orgs, login: gh.githubLogin };
  }

  async detectRepoFramework(
    userId: string,
    owner: string,
    repo: string,
    branch: string,
    rootDirectory = '',
  ) {
    const gh = await this.github.getConnection(userId);
    if (!gh) {
      throw new BadRequestException({
        message: 'Connect GitHub first',
        code: 'github_not_connected',
      });
    }
    const root = rootDirectory.replace(/^\/+|\/+$/g, '');
    const pkgPath = root ? `${root}/package.json` : 'package.json';
    const pkgRaw = await this.github.getFileContent(
      gh.accessToken,
      owner,
      repo,
      pkgPath,
      branch,
    );
    if (!pkgRaw) {
      return {
        preset: FRAMEWORK_PRESETS.unknown,
        packageJsonFound: false,
      };
    }
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid package.json');
    }
    const nextCandidates = ['next.config.ts', 'next.config.js', 'next.config.mjs'];
    let nextConfig: string | null = null;
    for (const f of nextCandidates) {
      const p = root ? `${root}/${f}` : f;
      nextConfig = await this.github.getFileContent(
        gh.accessToken,
        owner,
        repo,
        p,
        branch,
      );
      if (nextConfig) break;
    }
    const preset = detectFramework(pkg as never, nextConfig);
    return { preset, packageJsonFound: true };
  }

  async importSite(
    orgSlug: string,
    projectSlug: string,
    userId: string,
    body: {
      owner: string;
      repo: string;
      repoId?: string;
      branch?: string;
      rootDirectory?: string;
      framework?: HostingFrameworkId;
      buildCommand?: string;
      outputDirectory?: string;
      installCommand?: string;
      env?: { key: string; value: string; isSecret?: boolean }[];
    },
  ) {
    if (!this.cf.isConfigured()) {
      throw new BadRequestException({
        message:
          'Hosting is not configured. Set CF_ACCOUNT_ID and CF_API_TOKEN.',
        code: 'hosting_not_configured',
      });
    }

    const count = await this.cf.projectCount();
    if (count >= this.cf.softCapProjects()) {
      throw new BadRequestException({
        message: `Free Cloudflare Pages limit nearly reached (${count}/${this.cf.softCapProjects()}). Upgrade to Workers for Platforms for more sites.`,
        code: 'hosting_project_cap',
      });
    }

    const project = await this.getProject(orgSlug, projectSlug);
    const [existing] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);
    if (existing) {
      throw new BadRequestException({
        message: 'This project already has a hosted site. Disconnect first.',
        code: 'site_exists',
      });
    }

    const gh = await this.github.getConnection(userId);
    if (!gh) {
      throw new BadRequestException({
        message: 'Connect GitHub first',
        code: 'github_not_connected',
      });
    }

    const branch = body.branch || 'main';
    const rootDirectory = (body.rootDirectory || '').replace(/^\/+|\/+$/g, '');
    let framework = body.framework;
    let buildCommand = body.buildCommand;
    let outputDirectory = body.outputDirectory;
    let installCommand = body.installCommand;

    if (!framework || !buildCommand || !outputDirectory) {
      const detected = await this.detectRepoFramework(
        userId,
        body.owner,
        body.repo,
        branch,
        rootDirectory,
      );
      framework = framework || detected.preset.id;
      buildCommand = buildCommand || detected.preset.buildCommand;
      outputDirectory = outputDirectory || detected.preset.outputDirectory;
      installCommand = installCommand || detected.preset.installCommand;
      if (!detected.preset.supportsDeploy) {
        throw new BadRequestException({
          message: detected.preset.warning || 'Framework not supported on Free Pages',
          code: 'framework_unsupported',
        });
      }
    }

    const preset =
      FRAMEWORK_PRESETS[framework as HostingFrameworkId] ||
      FRAMEWORK_PRESETS.unknown;
    if (!preset.supportsDeploy) {
      throw new BadRequestException({
        message: preset.warning || 'Framework not supported',
        code: 'framework_unsupported',
      });
    }

    const cfName = `vb-${project.slug}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 58);
    const cfProject = await this.cf.createProject(cfName, branch);
    // CF's `subdomain` is often already `name.pages.dev` — don't append twice.
    const pagesDevUrl = this.pagesDevHttpsUrl(cfProject.subdomain || cfName);
    const productionUrl = `https://${project.slug}.${this.cf.hostingRootDomain()}`;

    const systemEnv = voltbaseEnvForFramework(
      preset,
      project.projectUrl,
      project.anonKey,
    );
    try {
      await this.cf.updateProjectEnv(cfName, systemEnv);
    } catch (err) {
      this.logger.warn(`Failed to set Pages env: ${String(err)}`);
    }

    const [site] = await this.drizzle.db
      .insert(hostedSites)
      .values({
        projectId: project.id,
        githubOwner: body.owner,
        githubRepo: body.repo,
        githubRepoId: body.repoId,
        branch,
        rootDirectory,
        framework: preset.id,
        buildCommand: buildCommand || preset.buildCommand,
        outputDirectory: outputDirectory || preset.outputDirectory,
        installCommand: installCommand || preset.installCommand,
        cfPagesProjectName: cfName,
        productionUrl,
        pagesDevUrl,
        status: 'importing',
      })
      .returning();

    for (const [key, value] of Object.entries(systemEnv)) {
      await this.drizzle.db.insert(hostedSiteEnv).values({
        hostedSiteId: site.id,
        key,
        value,
        isSystem: true,
        isSecret: key.includes('KEY'),
      });
    }

    if (body.env?.length) {
      for (const v of body.env) {
        const key = v.key?.trim();
        if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        if (systemEnv[key] !== undefined) continue;
        await this.drizzle.db.insert(hostedSiteEnv).values({
          hostedSiteId: site.id,
          key,
          value: v.value ?? '',
          isSystem: false,
          isSecret:
            Boolean(v.isSecret) || /SECRET|TOKEN|KEY|PASSWORD/i.test(key),
        });
      }
    }

    await this.syncEnvToCloudflare(site.id, cfName);

    // Kick off first deploy async
    void this.runDeploy(orgSlug, projectSlug, userId, site.id);

    return this.getStatus(orgSlug, projectSlug, userId);
  }

  async redeploy(orgSlug: string, projectSlug: string, userId: string) {
    const project = await this.getProject(orgSlug, projectSlug);
    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);
    if (!site) throw new NotFoundException('No hosted site');
    void this.runDeploy(orgSlug, projectSlug, userId, site.id);
    return this.getStatus(orgSlug, projectSlug, userId);
  }

  async getDeployment(
    orgSlug: string,
    projectSlug: string,
    deploymentId: string,
  ) {
    const project = await this.getProject(orgSlug, projectSlug);
    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);
    if (!site) throw new NotFoundException('No hosted site');
    const [dep] = await this.drizzle.db
      .select()
      .from(hostedDeployments)
      .where(
        and(
          eq(hostedDeployments.id, deploymentId),
          eq(hostedDeployments.hostedSiteId, site.id),
        ),
      )
      .limit(1);
    if (!dep) throw new NotFoundException('Deployment not found');
    return dep;
  }

  async disconnect(orgSlug: string, projectSlug: string) {
    const project = await this.getProject(orgSlug, projectSlug);
    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.projectId, project.id))
      .limit(1);
    if (!site) return { ok: true };
    try {
      await this.cf.deleteProject(site.cfPagesProjectName);
    } catch (err) {
      this.logger.warn(`CF delete project failed: ${String(err)}`);
    }
    await this.drizzle.db
      .delete(hostedSites)
      .where(eq(hostedSites.id, site.id));
    return { ok: true };
  }

  private async updateDeploy(
    id: string,
    patch: Partial<typeof hostedDeployments.$inferInsert>,
  ) {
    await this.drizzle.db
      .update(hostedDeployments)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(hostedDeployments.id, id));
  }

  private async runDeploy(
    orgSlug: string,
    projectSlug: string,
    userId: string,
    siteId: string,
  ) {
    if (this.deploying.has(siteId)) return;
    this.deploying.add(siteId);
    const started = Date.now();

    const [site] = await this.drizzle.db
      .select()
      .from(hostedSites)
      .where(eq(hostedSites.id, siteId))
      .limit(1);
    if (!site) {
      this.deploying.delete(siteId);
      return;
    }

    const [dep] = await this.drizzle.db
      .insert(hostedDeployments)
      .values({
        hostedSiteId: site.id,
        status: 'building',
        stage: 'queued',
        environment: 'production',
      })
      .returning();

    await this.drizzle.db
      .update(hostedSites)
      .set({
        status: 'building',
        lastDeployStatus: 'building',
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(hostedSites.id, site.id));

    let tmpDir: string | null = null;
    try {
      const gh = await this.github.getConnection(userId);
      if (!gh) throw new Error('GitHub not connected');

      await this.updateDeploy(dep.id, { stage: 'downloading' });
      const tarball = await this.github.downloadTarball(
        gh.accessToken,
        site.githubOwner,
        site.githubRepo,
        site.branch,
      );

      tmpDir = await mkdtemp(path.join(os.tmpdir(), 'vb-host-'));
      const tarPath = path.join(tmpDir, 'repo.tar.gz');
      await writeFile(tarPath, tarball.buffer);
      const extractDir = path.join(tmpDir, 'src');
      await mkdir(extractDir, { recursive: true });
      await execFileAsync('tar', ['-xzf', tarPath, '-C', extractDir]);
      // GitHub tarballs wrap content in a single top-level folder
      const top = await readdir(extractDir);
      const repoRoot =
        top.length === 1
          ? path.join(extractDir, top[0]!)
          : extractDir;

      const workDir = site.rootDirectory
        ? path.join(repoRoot, site.rootDirectory)
        : repoRoot;

      // Write env file for build-time public vars
      const envRows = await this.drizzle.db
        .select()
        .from(hostedSiteEnv)
        .where(eq(hostedSiteEnv.hostedSiteId, site.id));
      const envLines = envRows.map((e) => `${e.key}=${e.value}`).join('\n');
      await writeFile(path.join(workDir, '.env.production'), envLines);
      await writeFile(path.join(workDir, '.env'), envLines);

      await this.updateDeploy(dep.id, {
        stage: 'installing',
        commitSha: tarball.commitSha,
        commitMessage: tarball.commitMessage,
      });

      // Never install with NODE_ENV=production — that skips vite and other
      // build tools that live in devDependencies.
      const installCmd = site.installCommand || 'npm install';
      const installLog = await this.runShell(installCmd, workDir, {
        productionEnv: false,
        extraEnv: Object.fromEntries(envRows.map((e) => [e.key, e.value])),
      });
      await this.appendDeployLog(dep.id, 'installing', installLog);

      // adapter-auto emits nothing off CF/Vercel/Netlify — pin Cloudflare adapter.
      if (site.framework === 'sveltekit') {
        const pinLog = await this.ensureSvelteKitCloudflareAdapter(workDir);
        if (pinLog) await this.appendDeployLog(dep.id, 'installing', pinLog);
      }

      await this.updateDeploy(dep.id, { stage: 'building' });
      const buildLog = await this.runShell(site.buildCommand, workDir, {
        productionEnv: true,
        extraEnv: Object.fromEntries(envRows.map((e) => [e.key, e.value])),
      });
      await this.appendDeployLog(dep.id, 'building', buildLog);

      const resolvedOut = await this.resolveBuildOutputDir(
        workDir,
        site.outputDirectory,
        site.framework,
      );
      if (!resolvedOut) {
        throw new Error(
          `Build finished but no deployable files found (looked for ${site.outputDirectory}). ` +
            (site.framework === 'sveltekit'
              ? 'SvelteKit needs @sveltejs/adapter-cloudflare or adapter-static — adapter-auto alone is not enough for Hosting builds.'
              : 'Check outputDirectory in Hosting settings.'),
        );
      }
      await this.updateDeploy(dep.id, { stage: 'deploying' });

      const cfDep = await this.cf.deployDirectory(
        site.cfPagesProjectName,
        resolvedOut.abs,
        {
          branch: site.branch,
          commitHash: tarball.commitSha,
          commitMessage: tarball.commitMessage,
        },
      );
      await this.appendDeployLog(
        dep.id,
        'deploying',
        `Uploaded ${resolvedOut.rel}\nDeployment ${cfDep.id}\n${cfDep.url || ''}`,
      );

      if (resolvedOut.rel !== site.outputDirectory) {
        await this.drizzle.db
          .update(hostedSites)
          .set({
            outputDirectory: resolvedOut.rel,
            updatedAt: new Date(),
          })
          .where(eq(hostedSites.id, site.id));
      }

      const url = cfDep.url || site.pagesDevUrl || site.productionUrl;
      const canonicalPages = this.pagesDevHttpsUrl(
        site.pagesDevUrl || site.cfPagesProjectName,
      );
      await this.updateDeploy(dep.id, {
        status: 'ready',
        stage: 'ready',
        url,
        cfDeploymentId: cfDep.id,
        durationMs: Date.now() - started,
      });
      await this.drizzle.db
        .update(hostedSites)
        .set({
          status: 'ready',
          lastDeployId: dep.id,
          lastDeployStatus: 'ready',
          lastCommitSha: tarball.commitSha,
          pagesDevUrl: canonicalPages,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(hostedSites.id, site.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const logExtra =
        err && typeof err === 'object' && 'log' in err
          ? String((err as { log?: string }).log || '')
          : '';
      this.logger.error(`Deploy failed for ${siteId}: ${message}`);
      if (logExtra) {
        await this.appendDeployLog(dep.id, 'error', logExtra).catch(() => undefined);
      }
      await this.appendDeployLog(dep.id, 'error', message).catch(() => undefined);
      await this.updateDeploy(dep.id, {
        status: 'error',
        stage: 'error',
        errorMessage: message,
        durationMs: Date.now() - started,
      });
      await this.drizzle.db
        .update(hostedSites)
        .set({
          status: 'error',
          lastDeployStatus: 'error',
          lastError: message,
          updatedAt: new Date(),
        })
        .where(eq(hostedSites.id, site.id));
    } finally {
      this.deploying.delete(siteId);
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  private async appendDeployLog(id: string, stage: string, chunk: string) {
    if (!chunk?.trim()) return;
    const [row] = await this.drizzle.db
      .select({ logs: hostedDeployments.logs })
      .from(hostedDeployments)
      .where(eq(hostedDeployments.id, id))
      .limit(1);
    const logs = parseDeployLogs(row?.logs);
    const prev = logs[stage] || '';
    logs[stage] = `${prev}${prev ? '\n' : ''}${chunk}`.slice(-100_000);
    await this.updateDeploy(id, { logs: JSON.stringify(logs) });
  }

  private pagesDevHttpsUrl(subdomainOrName: string) {
    let raw = subdomainOrName
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');
    // Older imports appended `.pages.dev` when CF already returned a full host.
    while (raw.endsWith('.pages.dev.pages.dev')) {
      raw = raw.slice(0, -'.pages.dev'.length);
    }
    if (raw.endsWith('.pages.dev')) return `https://${raw}`;
    return `https://${raw}.pages.dev`;
  }

  /**
   * Repos scaffolded with adapter-auto produce an empty output when built
   * outside CF/Vercel/Netlify. Swap to adapter-cloudflare for Pages Direct Upload.
   */
  private async ensureSvelteKitCloudflareAdapter(
    workDir: string,
  ): Promise<string | undefined> {
    const candidates = [
      'svelte.config.js',
      'svelte.config.ts',
      'svelte.config.mjs',
    ];
    let configPath: string | null = null;
    let raw = '';
    for (const name of candidates) {
      const p = path.join(workDir, name);
      try {
        await access(p, fsConstants.R_OK);
        raw = await readFile(p, 'utf8');
        configPath = p;
        break;
      } catch {
        // try next
      }
    }
    if (!configPath) return;

    if (
      raw.includes('@sveltejs/adapter-cloudflare') ||
      raw.includes('@sveltejs/adapter-static')
    ) {
      return;
    }

    if (!raw.includes('@sveltejs/adapter-auto')) {
      this.logger.warn(
        'SvelteKit config has no adapter-auto/cloudflare/static — build may lack Pages output',
      );
      return;
    }

    this.logger.log('Pinning @sveltejs/adapter-cloudflare for SvelteKit deploy');
    const installLog = await this.runShell(
      'npm install -D @sveltejs/adapter-cloudflare',
      workDir,
      { productionEnv: false },
    );

    const next = raw.replace(
      /@sveltejs\/adapter-auto/g,
      '@sveltejs/adapter-cloudflare',
    );
    await writeFile(configPath, next, 'utf8');
    return `Pinned @sveltejs/adapter-cloudflare\n${installLog}`;
  }

  private async resolveBuildOutputDir(
    workDir: string,
    configured: string,
    framework: string | null,
  ): Promise<{ abs: string; rel: string } | null> {
    const candidates = [
      configured,
      ...(framework === 'sveltekit'
        ? ['.svelte-kit/cloudflare', 'build']
        : []),
      'dist',
      '.output/public',
      'out',
      'build',
    ].filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i);

    for (const rel of candidates) {
      const abs = path.join(workDir, rel);
      if (await this.directoryHasFiles(abs)) {
        return { abs, rel: rel.replace(/\\/g, '/') };
      }
    }
    return null;
  }

  private async directoryHasFiles(dir: string): Promise<boolean> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      if (entry.isFile()) return true;
      if (entry.isDirectory()) {
        const nested = await this.directoryHasFiles(path.join(dir, entry.name));
        if (nested) return true;
      }
    }
    return false;
  }

  private async runShell(
    command: string,
    cwd: string,
    opts: { productionEnv: boolean; extraEnv?: Record<string, string> },
  ): Promise<string> {
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'cmd' : 'sh';
    const args = isWin ? ['/c', command] : ['-c', command];
    const binDir = path.join(cwd, 'node_modules', '.bin');
    const pathKey = isWin ? 'Path' : 'PATH';
    const existing =
      process.env[pathKey] ?? process.env.PATH ?? process.env.Path ?? '';
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...opts.extraEnv,
      CI: 'true',
      // Hint adapter-auto / tooling that the target is Cloudflare Pages.
      CF_PAGES: '1',
      [pathKey]: `${binDir}${path.delimiter}${existing}`,
    };
    if (opts.productionEnv) {
      env.NODE_ENV = 'production';
    } else {
      // Install must include devDependencies (vite, etc.).
      delete env.NODE_ENV;
    }
    try {
      const { stdout, stderr } = await execFileAsync(shell, args, {
        cwd,
        env,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 15 * 60 * 1000,
      });
      return [`$ ${command}`, stdout?.toString(), stderr?.toString()]
        .filter(Boolean)
        .join('\n')
        .slice(-100_000);
    } catch (err) {
      const e = err as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const log = [`$ ${command}`, e.stdout?.toString(), e.stderr?.toString()]
        .filter(Boolean)
        .join('\n')
        .slice(-100_000);
      const message =
        e.stderr?.toString().slice(-2000) ||
        e.message ||
        'Build command failed';
      throw Object.assign(new Error(message), { log });
    }
  }
}

function parseDeployLogs(
  raw: string | null | undefined,
): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
  } catch {
    // ignore
  }
  return {};
}
