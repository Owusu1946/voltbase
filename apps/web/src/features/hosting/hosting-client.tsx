'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  Loader2,
  Plus,
  Rocket,
  Search,
  RefreshCw,
  Trash2,
  Unplug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  connectGithubAction,
  deleteHostingEnvAction,
  detectFrameworkAction,
  disconnectGithubAction,
  disconnectSiteAction,
  getHostingStatusAction,
  importSiteAction,
  listReposAction,
  redeployAction,
  upsertHostingEnvAction,
  type GithubRepo,
  type HostingDeployment,
  type HostingEnvVar,
  type HostingFrameworkPreset,
  type HostingStatus,
} from './actions';
import { parseEnvPaste } from './parse-env-paste';

const STAGES = [
  'queued',
  'downloading',
  'installing',
  'building',
  'deploying',
  'ready',
] as const;

function stageIndex(stage: string) {
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return i >= 0 ? i : stage === 'error' ? -1 : 0;
}

export function HostingClient({
  orgSlug,
  projectSlug,
  initial,
}: {
  orgSlug: string;
  projectSlug: string;
  initial: HostingStatus;
}) {
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getHostingStatusAction(orgSlug, projectSlug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setStatus(result.data);
    });
  }, [orgSlug, projectSlug]);

  const building = Boolean(
    status.site &&
      (status.site.status === 'building' ||
        status.site.status === 'importing' ||
        status.deployments[0]?.status === 'building'),
  );

  useEffect(() => {
    if (!building) return;
    const id = setInterval(() => {
      void getHostingStatusAction(orgSlug, projectSlug).then((result) => {
        if (result.ok) setStatus(result.data);
      });
    }, 1500);
    return () => clearInterval(id);
  }, [building, orgSlug, projectSlug]);

  const liveUrl = status.site?.pagesDevUrl || status.site?.productionUrl;
  const latest = status.deployments[0];

  async function connectGithub() {
    startTransition(async () => {
      const result = await connectGithubAction(orgSlug, projectSlug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }

  async function copyUrl() {
    if (!liveUrl) return;
    await navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hosting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a Git repo and ship to the edge — Voltbase URL and anon key
            are injected automatically.
          </p>
        </div>
        {status.site ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || building}
              onClick={() =>
                startTransition(async () => {
                  const r = await redeployAction(orgSlug, projectSlug);
                  if (!r.ok) setError(r.error);
                  else setStatus(r.data);
                })
              }
            >
              <RefreshCw size={14} className="mr-1.5" />
              Redeploy
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await disconnectSiteAction(orgSlug, projectSlug);
                  if (!r.ok) setError(r.error);
                  else refresh();
                })
              }
            >
              <Unplug size={14} className="mr-1.5" />
              Disconnect
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!status.configured ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium">Hosting is not configured</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set <code className="font-mono text-xs">CF_ACCOUNT_ID</code> and{' '}
            <code className="font-mono text-xs">CF_API_TOKEN</code> on the API
            to enable Cloudflare Pages deploys.
          </p>
        </div>
      ) : null}

      {status.nearCap ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Approaching Free Pages limit ({status.projectCount}/
          {status.softCap} projects). Upgrade to Workers for Platforms for more
          sites.
        </p>
      ) : null}

      {!status.site && status.configured ? (
        <EmptyState
          githubConnected={status.githubConnected}
          githubLogin={status.githubLogin}
          githubOAuthConfigured={status.githubOAuthConfigured}
          pending={pending}
          onConnectGithub={() => void connectGithub()}
          onImport={() => setImportOpen(true)}
          onDisconnectGithub={() =>
            startTransition(async () => {
              await disconnectGithubAction(orgSlug, projectSlug);
              refresh();
            })
          }
        />
      ) : null}

      {status.site && building ? (
        <BuildTheater
          stage={latest?.stage || 'queued'}
          error={latest?.errorMessage || status.site.lastError}
          logs={latest?.logs || {}}
          onRetry={() =>
            startTransition(async () => {
              const r = await redeployAction(orgSlug, projectSlug);
              if (!r.ok) setError(r.error);
              else setStatus(r.data);
            })
          }
        />
      ) : null}

      {status.site && !building ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b bg-muted/30 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex size-2 rounded-full',
                    status.site.status === 'ready'
                      ? 'bg-emerald-500'
                      : status.site.status === 'error'
                        ? 'bg-destructive'
                        : 'bg-muted-foreground',
                  )}
                />
                <p className="font-medium">
                  {status.site.status === 'ready' ? 'Ready' : status.site.status}
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  {status.site.fullName}
                </span>
              </div>
              {liveUrl ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-mono text-sm text-foreground underline-offset-4 hover:underline"
                  >
                    {liveUrl}
                  </a>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => void copyUrl()}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                  <Button type="button" size="sm" asChild>
                    <a href={liveUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} className="mr-1.5" />
                      Visit
                    </a>
                  </Button>
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Framework{' '}
                <span className="font-mono">{status.site.framework}</span>
                {status.site.lastCommitSha
                  ? ` · ${status.site.lastCommitSha.slice(0, 7)}`
                  : ''}
              </p>
              {status.site.lastError ? (
                <p className="mt-2 text-sm text-destructive">
                  {status.site.lastError}
                </p>
              ) : null}
            </div>
            <div className="px-5 py-3 text-xs text-muted-foreground">
              Production alias:{' '}
              <span className="font-mono">
                {status.site.productionUrl ||
                  `https://${projectSlug}.${status.rootDomain}`}
              </span>{' '}
              (configure DNS when ready)
            </div>
          </div>

          <EnvPanel
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            env={status.env ?? []}
            onChange={(env) => setStatus((s) => ({ ...s, env }))}
            onError={setError}
          />

          <div>
            <h2 className="mb-3 text-sm font-medium">Deployments</h2>
            <DeploymentsList deployments={status.deployments} />
          </div>
        </div>
      ) : null}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
        onImported={(data) => {
          setStatus(data);
          setImportOpen(false);
        }}
        onError={setError}
      />
    </div>
  );
}

function EmptyState({
  githubConnected,
  githubLogin,
  githubOAuthConfigured,
  pending,
  onConnectGithub,
  onImport,
  onDisconnectGithub,
}: {
  githubConnected: boolean;
  githubLogin: string | null;
  githubOAuthConfigured: boolean;
  pending: boolean;
  onConnectGithub: () => void;
  onImport: () => void;
  onDisconnectGithub: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Rocket size={22} className="text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">
        Import Git Repository
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Connect GitHub, pick a repo, and deploy. Framework settings are
        detected automatically.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {!githubConnected ? (
          <Button
            type="button"
            disabled={pending || !githubOAuthConfigured}
            onClick={onConnectGithub}
          >
            <GitBranch size={16} className="mr-2" />
            Connect GitHub
          </Button>
        ) : (
          <>
            <Button type="button" onClick={onImport}>
              <GitBranch size={16} className="mr-2" />
              Import Repository
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDisconnectGithub}
            >
              Connected as {githubLogin}
            </Button>
          </>
        )}
      </div>
      {!githubOAuthConfigured ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Configure GitHub OAuth (
          <code className="font-mono">GITHUB_CLIENT_ID</code> / hosting
          overrides) to connect.
        </p>
      ) : null}
      <a
        href="/docs/hosting"
        className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Read the Hosting docs
      </a>
    </div>
  );
}

function BuildTheater({
  stage,
  error,
  logs,
  onRetry,
}: {
  stage: string;
  error: string | null;
  logs: Record<string, string>;
  onRetry: () => void;
}) {
  const idx = stageIndex(stage);
  const failed = stage === 'error';
  const [logTab, setLogTab] = useState<string>('installing');

  useEffect(() => {
    if (stage === 'building' || stage === 'deploying' || stage === 'installing') {
      setLogTab(stage);
    } else if (failed && logs.error) {
      setLogTab('error');
    }
  }, [stage, failed, logs.error]);

  const logStages = ['installing', 'building', 'deploying', 'error'] as const;
  const activeLog = logs[logTab] || '';

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-6 py-5">
        <div className="flex items-center gap-2">
          {!failed ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : null}
          <p className="font-medium">
            {failed ? 'Deploy failed' : 'Building…'}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {failed
            ? 'Check the logs below, then retry or edit settings.'
            : 'Installing dependencies and shipping to Cloudflare Pages.'}
        </p>
      </div>
      <ol className="space-y-0 border-b px-6 py-5">
        {STAGES.filter((s) => s !== 'ready' || !failed).map((s, i) => {
          const done = !failed && idx > i;
          const active = !failed && idx === i;
          return (
            <li key={s} className="flex items-center gap-3 py-2">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border text-[10px] font-medium transition-colors',
                  done && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                  active && 'border-foreground bg-foreground text-background',
                  !done && !active && 'text-muted-foreground',
                  failed && i === 0 && 'border-destructive text-destructive',
                )}
              >
                {done ? <Check size={12} /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-sm capitalize',
                  active && 'font-medium',
                  !active && !done && 'text-muted-foreground',
                )}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {logStages
            .filter((s) => s !== 'error' || failed || logs.error)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLogTab(s)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] capitalize',
                  logTab === s
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {s}
              </button>
            ))}
        </div>
        <pre className="max-h-56 overflow-auto rounded-lg bg-zinc-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-200">
          {activeLog.trim() || 'Waiting for output…'}
        </pre>
      </div>
      {error ? (
        <div className="border-t px-6 py-4">
          <p className="whitespace-pre-wrap font-mono text-xs text-destructive">
            {error}
          </p>
          <Button type="button" size="sm" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DeploymentsList({ deployments }: { deployments: HostingDeployment[] }) {
  const [openId, setOpenId] = useState<string | null>(
    deployments[0]?.id ?? null,
  );
  const [logTab, setLogTab] = useState('installing');

  if (deployments.length === 0) {
    return (
      <div className="rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
        No deployments yet
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {deployments.map((d) => {
        const open = openId === d.id;
        const logs = d.logs || {};
        const tabs = (
          ['installing', 'building', 'deploying', 'error'] as const
        ).filter((t) => t !== 'error' || logs.error || d.status === 'error');
        return (
          <li key={d.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
              onClick={() => {
                setOpenId(open ? null : d.id);
                if (!open) {
                  setLogTab(
                    logs.building
                      ? 'building'
                      : logs.installing
                        ? 'installing'
                        : tabs[0] || 'installing',
                  );
                }
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      d.status === 'ready'
                        ? 'bg-emerald-500'
                        : d.status === 'error'
                          ? 'bg-destructive'
                          : 'bg-amber-400',
                    )}
                  />
                  <p className="truncate text-sm font-medium">
                    {d.commitMessage || d.environment}
                  </p>
                  <ChevronDown
                    size={14}
                    className={cn(
                      'shrink-0 text-muted-foreground transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {d.commitSha?.slice(0, 7) || '—'} · {d.stage}
                  {d.durationMs
                    ? ` · ${(d.durationMs / 1000).toFixed(1)}s`
                    : ''}
                </p>
              </div>
              {d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open
                </a>
              ) : null}
            </button>
            {open ? (
              <div className="border-t bg-muted/20 px-4 py-3">
                <div className="mb-2 flex flex-wrap gap-1">
                  {tabs.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLogTab(t)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px] capitalize',
                        logTab === t
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-200">
                  {(logs[logTab] || d.errorMessage || 'No logs for this stage.')
                    .trim()}
                </pre>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function EnvPanel({
  orgSlug,
  projectSlug,
  env,
  onChange,
  onError,
}: {
  orgSlug: string;
  projectSlug: string;
  env: HostingEnvVar[];
  onChange: (env: HostingEnvVar[]) => void;
  onError: (msg: string) => void;
}) {
  const [paste, setPaste] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function saveVars(vars: { key: string; value: string; isSecret?: boolean }[]) {
    if (!vars.length) return;
    setSaving(true);
    const result = await upsertHostingEnvAction(orgSlug, projectSlug, vars);
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onChange(result.env);
  }

  function applyPaste() {
    const parsed = parseEnvPaste(paste);
    if (!parsed.length) {
      onError('No KEY=value lines found in paste');
      return;
    }
    void saveVars(parsed).then(() => setPaste(''));
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Environment Variables</h2>
          <p className="text-xs text-muted-foreground">
            Paste a .env block or add keys — applied on the next build.
          </p>
        </div>
      </div>

      <div className="space-y-3 border-b px-4 py-3">
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            const parsed = parseEnvPaste(text);
            if (parsed.length >= 2) {
              e.preventDefault();
              void saveVars(parsed);
              setPaste('');
            }
          }}
          placeholder={'API_URL=https://…\nPUBLIC_TOKEN=…'}
          rows={3}
          className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving || !paste.trim()}
            onClick={() => applyPaste()}
          >
            {saving ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : null}
            Paste &amp; save
          </Button>
        </div>
      </div>

      <div className="grid gap-2 border-b px-4 py-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="KEY"
          className="font-mono text-xs"
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          className="font-mono text-xs"
        />
        <Button
          type="button"
          size="sm"
          disabled={saving || !key.trim()}
          onClick={() => {
            void saveVars([{ key: key.trim(), value }]).then(() => {
              setKey('');
              setValue('');
            });
          }}
        >
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>

      <ul className="divide-y">
        {env.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No environment variables yet
          </li>
        ) : (
          env.map((row) => {
            const show = revealed[row.key];
            const display =
              row.isSecret && !show
                ? '••••••••••••'
                : row.value ?? (row.hasValue ? '••••••••••••' : '');
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">
                      {row.key}
                    </span>
                    {row.isSystem ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        system
                      </span>
                    ) : null}
                    {row.isSecret ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        secret
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {display}
                  </p>
                </div>
                {row.isSecret ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() =>
                      setRevealed((r) => ({ ...r, [row.key]: !r[row.key] }))
                    }
                  >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                ) : null}
                {!row.isSystem ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    disabled={saving}
                    onClick={() => {
                      void deleteHostingEnvAction(
                        orgSlug,
                        projectSlug,
                        row.key,
                      ).then((result) => {
                        if (!result.ok) onError(result.error);
                        else onChange(result.env);
                      });
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  orgSlug,
  projectSlug,
  onImported,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  projectSlug: string;
  onImported: (data: HostingStatus) => void;
  onError: (msg: string) => void;
}) {
  const [q, setQ] = useState('');
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [orgFilter, setOrgFilter] = useState<string | 'all'>('all');
  const [orgs, setOrgs] = useState<{ login: string }[]>([]);
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GithubRepo | null>(null);
  const [preset, setPreset] = useState<HostingFrameworkPreset | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [branch, setBranch] = useState('main');
  const [rootDirectory, setRootDirectory] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [outputDirectory, setOutputDirectory] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [envPaste, setEnvPaste] = useState('');

  const loadRepos = useCallback(
    async (query?: string) => {
      setLoading(true);
      const result = await listReposAction(orgSlug, projectSlug, query);
      setLoading(false);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      setRepos(result.repos);
      setOrgs(result.orgs);
      setLogin(result.login);
    },
    [orgSlug, projectSlug, onError],
  );

  useEffect(() => {
    if (!open) return;
    void loadRepos();
  }, [open, loadRepos]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      void loadRepos(q.trim() || undefined);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, loadRepos]);

  const filtered = useMemo(() => {
    if (orgFilter === 'all') return repos;
    return repos.filter((r) => r.owner === orgFilter);
  }, [repos, orgFilter]);

  async function selectRepo(repo: GithubRepo) {
    setSelected(repo);
    setBranch(repo.defaultBranch);
    setDetecting(true);
    const result = await detectFrameworkAction(orgSlug, projectSlug, {
      owner: repo.owner,
      repo: repo.name,
      branch: repo.defaultBranch,
      rootDirectory: '',
    });
    setDetecting(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    setPreset(result.preset);
    setBuildCommand(result.preset.buildCommand);
    setOutputDirectory(result.preset.outputDirectory);
  }

  async function deploy() {
    if (!selected || !preset) return;
    if (!preset.supportsDeploy) {
      onError(preset.warning || 'Framework not supported on Free Pages');
      return;
    }
    setDeploying(true);
    const result = await importSiteAction(orgSlug, projectSlug, {
      owner: selected.owner,
      repo: selected.name,
      repoId: String(selected.id),
      branch,
      rootDirectory,
      framework: preset.id,
      buildCommand,
      outputDirectory,
      installCommand: preset.installCommand,
      env: parseEnvPaste(envPaste),
    });
    setDeploying(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onImported(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Import Git Repository</DialogTitle>
          <DialogDescription>
            Select a repository to deploy to Cloudflare Pages.
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-3 border-b px-5 py-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search repositories…"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={orgFilter === 'all'}
                  onClick={() => setOrgFilter('all')}
                >
                  All
                </FilterChip>
                {login ? (
                  <FilterChip
                    active={orgFilter === login}
                    onClick={() => setOrgFilter(login)}
                  >
                    {login}
                  </FilterChip>
                ) : null}
                {orgs.map((o) => (
                  <FilterChip
                    key={o.login}
                    active={orgFilter === o.login}
                    onClick={() => setOrgFilter(o.login)}
                  >
                    {o.login}
                  </FilterChip>
                ))}
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <li
                      key={i}
                      className="animate-pulse border-b px-5 py-4"
                    >
                      <div className="h-4 w-2/3 rounded bg-muted" />
                      <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
                    </li>
                  ))
                : filtered.map((repo) => (
                    <li key={repo.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                        onClick={() => void selectRepo(repo)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {repo.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {repo.description || repo.defaultBranch}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                      </button>
                    </li>
                  ))}
              {!loading && filtered.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No repositories found
                </li>
              ) : null}
            </ul>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSelected(null);
                setPreset(null);
              }}
            >
              ← Change repository
            </button>
            <div>
              <p className="font-medium">{selected.fullName}</p>
              {detecting ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Detecting framework…
                </p>
              ) : preset ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {preset.label}
                  </span>
                  {' · '}
                  Voltbase URL + anon key will be injected
                </p>
              ) : null}
              {preset?.warning ? (
                <p className="mt-2 text-sm text-amber-700">{preset.warning}</p>
              ) : null}
            </div>

            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowSettings((v) => !v)}
            >
              {showSettings ? 'Hide settings' : 'Edit settings'}
            </button>

            {showSettings ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Branch">
                  <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
                </Field>
                <Field label="Root directory">
                  <Input
                    value={rootDirectory}
                    onChange={(e) => setRootDirectory(e.target.value)}
                    placeholder="(repo root)"
                  />
                </Field>
                <Field label="Build command">
                  <Input
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Output directory">
                  <Input
                    value={outputDirectory}
                    onChange={(e) => setOutputDirectory(e.target.value)}
                    className="font-mono text-xs"
                  />
                </Field>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Environment Variables</Label>
              <textarea
                value={envPaste}
                onChange={(e) => setEnvPaste(e.target.value)}
                placeholder={'KEY=value\nANOTHER_KEY=…'}
                rows={4}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <p className="text-[11px] text-muted-foreground">
                Paste a .env block — lines are parsed as KEY=value before deploy.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  deploying || detecting || !preset || !preset.supportsDeploy
                }
                onClick={() => void deploy()}
              >
                {deploying ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Deploy'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
