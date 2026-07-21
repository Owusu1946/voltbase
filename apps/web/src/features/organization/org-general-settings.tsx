'use client';

import { useActionState, useState } from 'react';
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
import { organizationAction } from './action';
import { ORGANIZATION_INTENT } from './constants';
import { ORG_ROLES } from '@voltbase/constants';
import type { OrgRole } from '@voltbase/types';

export function OrgGeneralSettings({
  slug,
  name,
  role,
}: {
  slug: string;
  name: string;
  role: OrgRole;
}) {
  const isAdmin = role === ORG_ROLES.ADMIN;
  const [state, formAction, isPending] = useActionState(organizationAction, {});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <div>
        <h1 className="text-2xl font-medium">General</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rename or delete this organization. The URL slug stays the same.
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-600">{state.success}</p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="intent" value={ORGANIZATION_INTENT.UPDATE} />
        <input type="hidden" name="slug" value={slug} />
        <div className="space-y-2">
          <Label htmlFor="org-name">Display name</Label>
          <Input
            id="org-name"
            name="name"
            defaultValue={name}
            disabled={!isAdmin || isPending}
            minLength={2}
            required
          />
          <p className="text-xs text-muted-foreground">Slug: {slug}</p>
        </div>
        {isAdmin ? (
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save name'}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only admins can rename this organization.
          </p>
        )}
      </form>

      {isAdmin ? (
        <div className="space-y-3 border-t border-border pt-8">
          <h2 className="text-base font-medium text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting the organization permanently removes all projects and their
            database schemas.
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete organization
          </Button>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {name}?</DialogTitle>
                <DialogDescription>
                  This cannot be undone. Type DELETE to confirm.
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
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <form action={formAction}>
                  <input
                    type="hidden"
                    name="intent"
                    value={ORGANIZATION_INTENT.DELETE}
                  />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="confirm" value="DELETE" />
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={confirmText !== 'DELETE' || isPending}
                  >
                    Delete forever
                  </Button>
                </form>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </div>
  );
}
