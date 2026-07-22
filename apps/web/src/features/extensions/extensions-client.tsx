'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  enableVectorExtensionAction,
  listExtensionsAction,
  type ExtensionInfo,
} from './actions';

export function ExtensionsClient({
  orgSlug,
  projectSlug,
  initialExtensions,
}: {
  orgSlug: string;
  projectSlug: string;
  initialExtensions: ExtensionInfo[];
}) {
  const [extensions, setExtensions] = useState(initialExtensions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await listExtensionsAction(orgSlug, projectSlug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setExtensions(result.extensions);
    });
  }, [orgSlug, projectSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function enableVector() {
    startTransition(async () => {
      const result = await enableVectorExtensionAction(orgSlug, projectSlug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setExtensions((prev) =>
        prev.map((ext) =>
          ext.name === 'vector' ? { ...ext, ...result.extension } : ext,
        ),
      );
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Extensions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Postgres extensions available for this project database.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ul className="divide-y rounded-xl border bg-card">
        {extensions.map((ext) => (
          <li
            key={ext.name}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Puzzle size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{ext.displayName}</p>
                  <span className="font-mono text-xs text-muted-foreground">
                    {ext.name}
                  </span>
                  {ext.enabled ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Enabled
                      {ext.version ? ` · v${ext.version}` : ''}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ext.description}
                </p>
              </div>
            </div>
            {!ext.enabled && ext.name === 'vector' ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={enableVector}
              >
                {pending ? 'Enabling…' : 'Enable'}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
