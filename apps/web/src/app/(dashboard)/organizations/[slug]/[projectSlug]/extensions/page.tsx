import { ExtensionsClient } from '@/features/extensions/extensions-client';
import { listExtensionsAction } from '@/features/extensions/actions';

export default async function ExtensionsPage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  const result = await listExtensionsAction(slug, projectSlug);
  const initialExtensions = result.ok
    ? result.extensions
    : [
        {
          name: 'vector',
          displayName: 'pgvector',
          description: 'Embeddings and vector similarity search',
          enabled: false,
          version: null,
        },
      ];

  return (
    <ExtensionsClient
      orgSlug={slug}
      projectSlug={projectSlug}
      initialExtensions={initialExtensions}
    />
  );
}
