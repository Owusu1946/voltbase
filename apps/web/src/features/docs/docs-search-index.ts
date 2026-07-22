import { DOCS_NAV, flattenDocsNav } from './nav';
import { DOC_REGISTRY } from './registry';

export type DocsSearchHit = {
  id: string;
  href: string;
  title: string;
  group: string;
  description: string;
  kind: 'page' | 'section';
  sectionTitle?: string;
  /** Lowercased haystack for matching */
  haystack: string;
};

function groupForHref(href: string): string {
  for (const group of DOCS_NAV) {
    if (group.items.some((item) => item.href === href)) return group.title;
  }
  return 'Docs';
}

let cachedIndex: DocsSearchHit[] | null = null;

export function buildDocsSearchIndex(): DocsSearchHit[] {
  if (cachedIndex) return cachedIndex;

  const hits: DocsSearchHit[] = [
    {
      id: 'docs-home',
      href: '/docs',
      title: 'Documentation',
      group: 'Docs',
      description: 'Build with Voltbase — guides, SDK, REST, and examples.',
      kind: 'page',
      haystack:
        'documentation docs home build voltbase guides sdk rest examples',
    },
  ];

  for (const [slug, entry] of Object.entries(DOC_REGISTRY)) {
    const href = `/docs/${slug}`;
    const group = groupForHref(href);
    const pageHaystack = [
      entry.title,
      entry.description,
      group,
      slug.replace(/\//g, ' '),
      ...entry.toc.map((t) => t.title),
    ]
      .join(' ')
      .toLowerCase();

    hits.push({
      id: slug,
      href,
      title: entry.title,
      group,
      description: entry.description,
      kind: 'page',
      haystack: pageHaystack,
    });

    for (const toc of entry.toc) {
      hits.push({
        id: `${slug}#${toc.id}`,
        href: `${href}#${toc.id}`,
        title: entry.title,
        group,
        description: entry.description,
        kind: 'section',
        sectionTitle: toc.title,
        haystack: `${entry.title} ${toc.title} ${group} ${slug}`.toLowerCase(),
      });
    }
  }

  // Ensure every nav item is represented even if registry drifts
  for (const item of flattenDocsNav()) {
    if (hits.some((h) => h.href === item.href && h.kind === 'page')) continue;
    hits.push({
      id: item.href,
      href: item.href,
      title: item.title,
      group: groupForHref(item.href),
      description: '',
      kind: 'page',
      haystack: `${item.title} ${item.href}`.toLowerCase(),
    });
  }

  cachedIndex = hits;
  return hits;
}

function scoreHit(hit: DocsSearchHit, tokens: string[]): number {
  let score = 0;
  const title = hit.title.toLowerCase();
  const section = (hit.sectionTitle ?? '').toLowerCase();
  const desc = hit.description.toLowerCase();

  for (const token of tokens) {
    if (!hit.haystack.includes(token)) return -1;

    if (title === token) score += 100;
    else if (title.startsWith(token)) score += 60;
    else if (title.includes(token)) score += 40;

    if (section === token) score += 50;
    else if (section.startsWith(token)) score += 30;
    else if (section.includes(token)) score += 20;

    if (desc.includes(token)) score += 8;
    if (hit.href.toLowerCase().includes(token)) score += 5;
  }

  // Prefer pages over sections when scores are close
  if (hit.kind === 'page') score += 3;
  return score;
}

export function searchDocs(
  query: string,
  limit = 12,
  index = buildDocsSearchIndex(),
): DocsSearchHit[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [];

  return index
    .map((hit) => ({ hit, score: scoreHit(hit, tokens) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title))
    .slice(0, limit)
    .map((row) => row.hit);
}
