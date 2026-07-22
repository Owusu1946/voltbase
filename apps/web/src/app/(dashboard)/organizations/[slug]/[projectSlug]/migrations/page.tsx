import { retrieveMigrationsFromApi } from '@/features/migrations/migrations-helpers.server';
import { MigrationsClient } from '@/features/migrations/migrations-client';

export default async function MigrationsPage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  const migrations = await retrieveMigrationsFromApi(slug, projectSlug);

  return (
    <div className="-mx-6 -mt-6 -mb-6 flex h-[calc(100svh-3rem)] min-h-0 flex-col overflow-hidden">
      <MigrationsClient
        orgSlug={slug}
        projectSlug={projectSlug}
        initialMigrations={migrations}
      />
    </div>
  );
}
