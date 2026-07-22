'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { TableInfo } from '@voltbase/types';
import {
  createForeignKeyAction,
  createIndexAction,
  createPolicyAction,
  createUniqueAction,
  dropConstraintAction,
  dropIndexAction,
  dropPolicyAction,
  setRlsAction,
} from './constraints-action';

type Tab = 'indexes' | 'foreignKeys' | 'unique' | 'policies';

export function SchemaConstraintsPanel({
  orgSlug,
  projectSlug,
  tableInfo,
  tables,
  onChanged,
}: {
  orgSlug: string;
  projectSlug: string;
  tableInfo: TableInfo;
  tables: string[];
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>('indexes');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const indexes = tableInfo.indexes ?? [];
  const foreignKeys = tableInfo.foreignKeys ?? [];
  const uniqueConstraints = tableInfo.uniqueConstraints ?? [];
  const policies = tableInfo.policies ?? [];
  const columnNames = tableInfo.columns.map((c) => c.name);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? 'Failed');
        return;
      }
      onChanged();
    });
  };

  return (
    <div className="space-y-4 border-t border-border px-4 py-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['indexes', 'Indexes'],
            ['foreignKeys', 'Foreign keys'],
            ['unique', 'Unique'],
            ['policies', 'Policies'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {tab === 'indexes' ? (
        <IndexesTab
          indexes={indexes}
          columnNames={columnNames}
          disabled={isPending}
          onCreate={(body) =>
            run(() =>
              createIndexAction(orgSlug, projectSlug, tableInfo.name, body),
            )
          }
          onDrop={(name) =>
            run(() =>
              dropIndexAction(orgSlug, projectSlug, tableInfo.name, name),
            )
          }
        />
      ) : null}

      {tab === 'foreignKeys' ? (
        <ForeignKeysTab
          foreignKeys={foreignKeys}
          columnNames={columnNames}
          tables={tables.filter((t) => t !== tableInfo.name)}
          disabled={isPending}
          onCreate={(body) =>
            run(() =>
              createForeignKeyAction(
                orgSlug,
                projectSlug,
                tableInfo.name,
                body,
              ),
            )
          }
          onDrop={(name) =>
            run(() =>
              dropConstraintAction(orgSlug, projectSlug, tableInfo.name, name),
            )
          }
        />
      ) : null}

      {tab === 'unique' ? (
        <UniqueTab
          constraints={uniqueConstraints}
          columnNames={columnNames}
          disabled={isPending}
          onCreate={(body) =>
            run(() =>
              createUniqueAction(orgSlug, projectSlug, tableInfo.name, body),
            )
          }
          onDrop={(name) =>
            run(() =>
              dropConstraintAction(orgSlug, projectSlug, tableInfo.name, name),
            )
          }
        />
      ) : null}

      {tab === 'policies' ? (
        <PoliciesTab
          rlsEnabled={tableInfo.rlsEnabled ?? false}
          policies={policies}
          disabled={isPending}
          onToggleRls={(enabled) =>
            run(() =>
              setRlsAction(orgSlug, projectSlug, tableInfo.name, enabled),
            )
          }
          onCreate={(body) =>
            run(() =>
              createPolicyAction(orgSlug, projectSlug, tableInfo.name, body),
            )
          }
          onDrop={(name) =>
            run(() =>
              dropPolicyAction(orgSlug, projectSlug, tableInfo.name, name),
            )
          }
        />
      ) : null}
    </div>
  );
}

function IndexesTab({
  indexes,
  columnNames,
  disabled,
  onCreate,
  onDrop,
}: {
  indexes: TableInfo['indexes'];
  columnNames: string[];
  disabled: boolean;
  onCreate: (body: {
    name?: string;
    columns: string[];
    unique?: boolean;
  }) => void;
  onDrop: (name: string) => void;
}) {
  const [columns, setColumns] = useState(columnNames[0] ?? '');
  const [unique, setUnique] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm">
        {indexes.map((idx) => (
          <li
            key={idx.name}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs">{idx.name}</p>
              <p className="text-xs text-muted-foreground">
                ({idx.columns.join(', ')})
                {idx.unique ? ' · unique' : ''}
                {idx.primary ? ' · primary' : ''}
              </p>
            </div>
            {!idx.primary ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => onDrop(idx.name)}
              >
                Drop
              </Button>
            ) : null}
          </li>
        ))}
        {indexes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No indexes</p>
        ) : null}
      </ul>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Columns (comma-separated)</Label>
          <Input
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
            placeholder={columnNames.join(', ')}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Name (optional)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={unique}
              onChange={(e) => setUnique(e.target.checked)}
            />
            Unique
          </label>
          <Button
            type="button"
            size="sm"
            disabled={disabled || !columns.trim()}
            onClick={() =>
              onCreate({
                name: name || undefined,
                columns: columns.split(',').map((c) => c.trim()).filter(Boolean),
                unique,
              })
            }
          >
            Add index
          </Button>
        </div>
      </div>
    </div>
  );
}

function UniqueTab({
  constraints,
  columnNames,
  disabled,
  onCreate,
  onDrop,
}: {
  constraints: TableInfo['uniqueConstraints'];
  columnNames: string[];
  disabled: boolean;
  onCreate: (body: { name?: string; columns: string[] }) => void;
  onDrop: (name: string) => void;
}) {
  const [columns, setColumns] = useState(columnNames[0] ?? '');
  const [name, setName] = useState('');

  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm">
        {(constraints ?? []).map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div>
              <p className="font-mono text-xs">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                ({c.columns.join(', ')})
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onDrop(c.name)}
            >
              Drop
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Columns</Label>
          <Input value={columns} onChange={(e) => setColumns(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || !columns.trim()}
          onClick={() =>
            onCreate({
              name: name || undefined,
              columns: columns.split(',').map((c) => c.trim()).filter(Boolean),
            })
          }
        >
          Add unique
        </Button>
      </div>
    </div>
  );
}

function ForeignKeysTab({
  foreignKeys,
  columnNames,
  tables,
  disabled,
  onCreate,
  onDrop,
}: {
  foreignKeys: TableInfo['foreignKeys'];
  columnNames: string[];
  tables: string[];
  disabled: boolean;
  onCreate: (body: {
    columns: string[];
    refTable: string;
    refColumns: string[];
    onDelete?: string;
  }) => void;
  onDrop: (name: string) => void;
}) {
  const [column, setColumn] = useState(columnNames[0] ?? '');
  const [refTable, setRefTable] = useState(tables[0] ?? '');
  const [refColumn, setRefColumn] = useState('id');
  const [onDelete, setOnDelete] = useState('NO ACTION');

  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm">
        {(foreignKeys ?? []).map((fk) => (
          <li
            key={fk.name}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div>
              <p className="font-mono text-xs">{fk.name}</p>
              <p className="text-xs text-muted-foreground">
                ({fk.columns.join(', ')}) → {fk.refTable}(
                {fk.refColumns.join(', ')})
                {fk.onDelete ? ` on delete ${fk.onDelete}` : ''}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onDrop(fk.name)}
            >
              Drop
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Column</Label>
          <Input value={column} onChange={(e) => setColumn(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ref table</Label>
          <Input
            value={refTable}
            onChange={(e) => setRefTable(e.target.value)}
            list="fk-tables"
          />
          <datalist id="fk-tables">
            {tables.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ref column</Label>
          <Input
            value={refColumn}
            onChange={(e) => setRefColumn(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">On delete</Label>
          <Input value={onDelete} onChange={(e) => setOnDelete(e.target.value)} />
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={disabled || !column || !refTable || !refColumn}
        onClick={() =>
          onCreate({
            columns: [column],
            refTable,
            refColumns: [refColumn],
            onDelete,
          })
        }
      >
        Add foreign key
      </Button>
    </div>
  );
}

function PoliciesTab({
  rlsEnabled,
  policies,
  disabled,
  onToggleRls,
  onCreate,
  onDrop,
}: {
  rlsEnabled: boolean;
  policies: TableInfo['policies'];
  disabled: boolean;
  onToggleRls: (enabled: boolean) => void;
  onCreate: (body: {
    name: string;
    cmd: string;
    roles?: string[];
    using?: string;
    withCheck?: string;
  }) => void;
  onDrop: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [cmd, setCmd] = useState('ALL');
  const [roles, setRoles] = useState('authenticated');
  const [using, setUsing] = useState('');
  const [withCheck, setWithCheck] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">Row level security</span>
          <Badge variant={rlsEnabled ? 'default' : 'secondary'}>
            {rlsEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onToggleRls(!rlsEnabled)}
        >
          {rlsEnabled ? 'Disable RLS' : 'Enable RLS'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Use <code className="font-mono">uid()</code> in expressions for the
        authenticated user id. Roles: anon, authenticated, public.
      </p>
      <ul className="space-y-2 text-sm">
        {(policies ?? []).map((p) => (
          <li
            key={p.name}
            className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.cmd} · {(p.roles ?? []).join(', ') || 'public'}
              </p>
              {p.using ? (
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  USING {p.using}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onDrop(p.name)}
            >
              Drop
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="policy name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="cmd (ALL|SELECT|…)"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
        />
        <Input
          placeholder="roles (anon,authenticated)"
          value={roles}
          onChange={(e) => setRoles(e.target.value)}
        />
        <Input
          placeholder="USING expression"
          value={using}
          onChange={(e) => setUsing(e.target.value)}
        />
        <Input
          placeholder="WITH CHECK expression"
          value={withCheck}
          onChange={(e) => setWithCheck(e.target.value)}
          className="sm:col-span-2"
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={disabled || !name.trim()}
        onClick={() =>
          onCreate({
            name,
            cmd,
            roles: roles
              .split(',')
              .map((r) => r.trim())
              .filter(Boolean),
            using: using || undefined,
            withCheck: withCheck || undefined,
          })
        }
      >
        Add policy
      </Button>
    </div>
  );
}
