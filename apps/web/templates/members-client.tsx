'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function MembersClient() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite a member</CardTitle>
        </CardHeader>
        {/* <CardContent>
          {state.error && (
            <p className="text-sm text-destructive mb-3">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600 mb-3">{state.success}</p>
          )}
          <form
            action={formAction}
            noValidate
            onSubmitCapture={async (e) => {
              const ok = await form.trigger(undefined, { shouldFocus: true });
              if (!ok) e.preventDefault();
            }}
            className="flex gap-2"
          >
            <FieldGroup className="flex-1">
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <Input
                      {...field}
                      type="email"
                      placeholder="colleague@example.com"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button
              type="submit"
              name="intent"
              value={MEMBERS_INTENT.INVITE}
              disabled={isPending}
            >
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 member</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{'MEMBER NAME'}</p>
                <p className="text-xs text-muted-foreground">
                  user@example.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select defaultValue="admin">
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" className="h-7 text-xs">
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          </div>
        </CardContent> */}
      </Card>
    </div>
  );
}
