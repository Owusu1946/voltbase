'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { TABLE_EDITOR_INTENT } from '@voltbase/constants';
import type { TableInfo } from '@voltbase/types';
import { tableEditorAction } from '@/features/table-editor/action';

interface InsertRowDialogProps {
  orgSlug: string;
  projectSlug: string;
  tableName: string;
  tableInfo: TableInfo;
  onInserted: () => void;
}

export function InsertRowDialog({
  orgSlug,
  projectSlug,
  tableName,
  tableInfo,
  onInserted,
}: InsertRowDialogProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const editableColumns = tableInfo.columns.filter(
    (col) => !(col.isPrimaryKey && col.defaultValue),
  );

  const reset = () => {
    setValues({});
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value.trim() !== '') payload[key] = value;
    }

    const formData = new FormData();
    formData.set('intent', TABLE_EDITOR_INTENT.INSERT_ROW);
    formData.set('tableName', tableName);
    formData.set('values', JSON.stringify(payload));

    const result = await tableEditorAction(
      { orgSlug, projectSlug },
      {},
      formData,
    );

    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    reset();
    setOpen(false);
    onInserted();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus size={14} />
        Insert row
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert row</DialogTitle>
            <DialogDescription>
              Add a row to <span className="font-mono">{tableName}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <FieldGroup>
              {editableColumns.map((col) => (
                <Field key={col.name}>
                  <FieldLabel htmlFor={`insert-${col.name}`}>
                    {col.name}
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({col.type}
                      {col.isPrimaryKey ? ', pk' : ''}
                      {!col.isNullable ? ', required' : ''})
                    </span>
                  </FieldLabel>
                  <Input
                    id={`insert-${col.name}`}
                    value={values[col.name] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [col.name]: e.target.value,
                      }))
                    }
                    placeholder={col.defaultValue ? `default: ${col.defaultValue}` : 'NULL'}
                    className="font-mono text-xs"
                  />
                </Field>
              ))}
            </FieldGroup>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Inserting…' : 'Insert'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
