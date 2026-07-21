'use client';

import { useActionState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { projectAuthAction } from './action';
import { githubOAuthSchema, googleOAuthSchema } from './client.schema';
import { PROJECT_AUTH_INTENT } from './constants';

function CallbackUrlField({ url }: { url: string }) {
  return (
    <div className="space-y-2">
      <FieldLabel>Callback URL (for OAuth)</FieldLabel>
      <p className="text-sm text-muted-foreground">
        Register this callback URL in your OAuth app settings.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={url} readOnly className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => navigator.clipboard.writeText(url)}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}

type GoogleValues = z.infer<typeof googleOAuthSchema>;
type GithubValues = z.infer<typeof githubOAuthSchema>;

export function GoogleOAuthForm({
  orgSlug,
  projectSlug,
  callbackUrl,
  defaultValues,
}: {
  orgSlug: string;
  projectSlug: string;
  callbackUrl: string;
  defaultValues: GoogleValues;
}) {
  const boundAction = projectAuthAction.bind(null, { orgSlug, projectSlug });
  const [state, formAction, isPending] = useActionState(boundAction, {});

  const form = useForm<GoogleValues>({
    resolver: zodResolver(googleOAuthSchema),
    defaultValues,
  });

  return (
    <form
      action={formAction}
      noValidate
      onSubmitCapture={async (e) => {
        const ok = await form.trigger(undefined, { shouldFocus: true });
        if (!ok) e.preventDefault();
      }}
      className="space-y-4"
    >
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}

      <FieldGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Controller
          name="googleClientId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="googleClientId">Client ID</FieldLabel>
              <Input
                {...field}
                id="googleClientId"
                placeholder="Google OAuth client ID"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="googleClientSecret"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="googleClientSecret">Client Secret</FieldLabel>
              <Input
                {...field}
                id="googleClientSecret"
                type="password"
                placeholder="Google OAuth client secret"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <CallbackUrlField url={callbackUrl} />

      <Button
        type="submit"
        name="intent"
        value={PROJECT_AUTH_INTENT.SAVE_GOOGLE}
        disabled={isPending}
      >
        {isPending ? 'Saving…' : 'Save Google settings'}
      </Button>
    </form>
  );
}

export function GithubOAuthForm({
  orgSlug,
  projectSlug,
  callbackUrl,
  defaultValues,
}: {
  orgSlug: string;
  projectSlug: string;
  callbackUrl: string;
  defaultValues: GithubValues;
}) {
  const boundAction = projectAuthAction.bind(null, { orgSlug, projectSlug });
  const [state, formAction, isPending] = useActionState(boundAction, {});

  const form = useForm<GithubValues>({
    resolver: zodResolver(githubOAuthSchema),
    defaultValues,
  });

  return (
    <form
      action={formAction}
      noValidate
      onSubmitCapture={async (e) => {
        const ok = await form.trigger(undefined, { shouldFocus: true });
        if (!ok) e.preventDefault();
      }}
      className="space-y-4"
    >
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}

      <FieldGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Controller
          name="githubClientId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="githubClientId">Client ID</FieldLabel>
              <Input
                {...field}
                id="githubClientId"
                placeholder="GitHub OAuth client ID"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="githubClientSecret"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="githubClientSecret">Client Secret</FieldLabel>
              <Input
                {...field}
                id="githubClientSecret"
                type="password"
                placeholder="GitHub OAuth client secret"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <CallbackUrlField url={callbackUrl} />

      <Button
        type="submit"
        name="intent"
        value={PROJECT_AUTH_INTENT.SAVE_GITHUB}
        disabled={isPending}
      >
        {isPending ? 'Saving…' : 'Save GitHub settings'}
      </Button>
    </form>
  );
}
