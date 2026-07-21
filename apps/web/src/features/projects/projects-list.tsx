'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { Database, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { projectsAction } from './action';
import { PROJECTS_INTENT } from './constants';

type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  projectUrl: string;
};

export function ProjectsList({
  slug,
  projects,
  isAdmin,
}: {
  slug: string;
  projects: ProjectListItem[];
  isAdmin: boolean;
}) {
  const boundAction = projectsAction.bind(null, { slug });
  const [state, formAction, isPending] = useActionState(boundAction, {});
  const [renameTarget, setRenameTarget] = useState<ProjectListItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(
    null,
  );
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (state.success) {
      setRenameTarget(null);
      setDeleteTarget(null);
      setConfirmText('');
    }
  }, [state.success]);

  return (
    <div>
      {state.error ? (
        <p className="mb-4 text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="mb-4 text-sm text-green-600">{state.success}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="relative flex items-center gap-4 rounded-xl border border-border bg-background p-5 transition-colors hover:bg-accent"
          >
            <Link
              href={`/organizations/${slug}/${project.slug}/database`}
              className="flex min-w-0 flex-1 items-center gap-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Database size={18} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {project.projectUrl}
                </p>
              </div>
            </Link>

            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRenameTarget(project)}>
                    <Pencil size={14} />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setConfirmText('');
                      setDeleteTarget(project);
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Changes the display name only. The project slug and URL stay the
              same.
            </DialogDescription>
          </DialogHeader>
          {renameTarget ? (
            <form action={formAction} className="space-y-4">
              <input
                type="hidden"
                name="intent"
                value={PROJECTS_INTENT.UPDATE}
              />
              <input
                type="hidden"
                name="projectSlug"
                value={renameTarget.slug}
              />
              <div className="space-y-2">
                <Label htmlFor="project-rename">Name</Label>
                <Input
                  id="project-rename"
                  name="name"
                  defaultValue={renameTarget.name}
                  minLength={2}
                  maxLength={50}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRenameTarget(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This drops the project database schema and cannot be undone. Type
              DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="font-mono"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            {deleteTarget ? (
              <form action={formAction}>
                <input
                  type="hidden"
                  name="intent"
                  value={PROJECTS_INTENT.DELETE}
                />
                <input
                  type="hidden"
                  name="projectSlug"
                  value={deleteTarget.slug}
                />
                <input type="hidden" name="confirm" value="DELETE" />
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={confirmText !== 'DELETE' || isPending}
                >
                  Delete forever
                </Button>
              </form>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
