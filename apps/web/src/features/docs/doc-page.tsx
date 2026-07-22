import type { ReactNode } from 'react';
import { DocsPager } from './docs-pager';
import { DocsToc, type TocItem } from './docs-toc';
import { DocsProse, PageHeader } from './docs-ui';

export function DocPage({
  title,
  description,
  pathname,
  toc = [],
  children,
}: {
  title: string;
  description?: string;
  pathname: string;
  toc?: TocItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex gap-10 px-4 py-8 lg:px-10 lg:py-10">
      <article className="min-w-0 flex-1">
        <PageHeader title={title} description={description} />
        <DocsProse>{children}</DocsProse>
        <DocsPager pathname={pathname} />
      </article>
      <DocsToc items={toc} />
    </div>
  );
}
