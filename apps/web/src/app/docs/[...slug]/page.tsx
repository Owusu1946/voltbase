import { notFound } from 'next/navigation';
import { DocPage } from '@/features/docs/doc-page';
import { getDocEntry, DOC_REGISTRY } from '@/features/docs/registry';

type Params = { slug: string[] };

export function generateStaticParams() {
  return Object.keys(DOC_REGISTRY).map((slug) => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const entry = getDocEntry(slug.join('/'));
  if (!entry) return { title: 'Docs | Voltbase' };
  return {
    title: `${entry.title} | Voltbase Docs`,
    description: entry.description,
  };
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug: parts } = await params;
  const slug = parts.join('/');
  const entry = getDocEntry(slug);
  if (!entry) notFound();

  const pathname = `/docs/${slug}`;

  return (
    <DocPage
      title={entry.title}
      description={entry.description}
      pathname={pathname}
      toc={entry.toc}
    >
      {entry.render()}
    </DocPage>
  );
}
