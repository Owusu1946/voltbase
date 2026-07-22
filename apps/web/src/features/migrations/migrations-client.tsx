'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ProjectMigration } from '@voltbase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, History } from 'lucide-react';
import { applyMigrationAction } from './action';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading editor...
    </div>
  ),
});

interface MigrationsClientProps {
  orgSlug: string;
  projectSlug: string;
  initialMigrations: ProjectMigration[];
}

export function MigrationsClient({
  orgSlug,
  projectSlug,
  initialMigrations,
}: MigrationsClientProps) {
  const [name, setName] = useState('');
  const [sql, setSql] = useState(
    'CREATE TABLE example (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid()\n);',
  );
  const [migrations, setMigrations] =
    useState<ProjectMigration[]>(initialMigrations);
  const [selected, setSelected] = useState<ProjectMigration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const applyMigration = useCallback(async () => {
    if (!name.trim() || !sql.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const outcome = await applyMigrationAction(orgSlug, projectSlug, {
        name: name.trim(),
        sql,
      });

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      setMigrations((prev) => [outcome.data, ...prev]);
      setSelected(null);
      setSuccess(`Applied v${outcome.data.version}: ${outcome.data.name}`);
      setName('');
    } catch {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, [name, sql, orgSlug, projectSlug]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-border">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
          <span className="text-sm font-medium">New migration</span>
          <Button
            size="sm"
            onClick={() => void applyMigration()}
            disabled={loading || !name.trim() || !sql.trim()}
            className="gap-1.5"
          >
            <Play size={12} />
            {loading ? 'Applying...' : 'Apply'}
          </Button>
        </div>

        <div className="shrink-0 border-b border-border px-4 py-3">
          <label
            htmlFor="migration-name"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Name
          </label>
          <Input
            id="migration-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="add_users_table"
            className="font-mono text-sm"
          />
        </div>

        {(error || success) && (
          <div
            className={
              error
                ? 'shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-3'
                : 'shrink-0 border-b border-border bg-muted/40 px-4 py-3'
            }
          >
            <p
              className={
                error
                  ? 'break-all font-mono text-xs text-destructive'
                  : 'text-xs text-foreground'
              }
            >
              {error ?? success}
            </p>
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <MonacoEditor
            height="100%"
            language="sql"
            value={selected ? selected.sql : sql}
            onChange={(v) => {
              if (selected) setSelected(null);
              setSql(v ?? '');
            }}
            theme="vs"
            className="absolute inset-0"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              wordWrap: 'on',
              readOnly: Boolean(selected),
            }}
          />
        </div>

        {selected && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>
              Viewing v{selected.version}: {selected.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSql(selected.sql);
                setSelected(null);
              }}
            >
              Edit as new
            </Button>
          </div>
        )}
      </div>

      <div className="flex h-full w-80 shrink-0 flex-col bg-background">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <History size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">History</span>
          <span className="text-xs text-muted-foreground">
            ({migrations.length})
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {migrations.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No migrations yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {migrations.map((item) => (
                <button
                  key={item.id}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent ${
                    selected?.id === item.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setSelected(item);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      v{item.version}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                  </div>
                  <p
                    className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground"
                    title={item.sql}
                  >
                    {item.sql}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.appliedAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
