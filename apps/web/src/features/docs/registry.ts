import type { ReactNode } from 'react';
import type { TocItem } from './docs-toc';
import { IntroductionPage } from './content/introduction';
import { QuickstartPage } from './content/quickstart';
import { FrameworksOverviewPage } from './content/frameworks-overview';
import { NextjsGuidePage } from './content/framework-nextjs';
import { ReactGuidePage } from './content/framework-react';
import { VueGuidePage } from './content/framework-vue';
import { NuxtGuidePage } from './content/framework-nuxt';
import { SveltekitGuidePage } from './content/framework-sveltekit';
import { AstroGuidePage } from './content/framework-astro';
import { ExpoGuidePage } from './content/framework-expo';
import { HonoGuidePage } from './content/framework-hono';
import { InstallPage } from './content/install';
import { DatabasePage } from './content/database';
import { AuthPage } from './content/auth';
import { StoragePage } from './content/storage';
import { RealtimePage } from './content/realtime';
import { RestOverviewPage } from './content/rest-overview';
import { RestCrudPage } from './content/rest-crud';
import { RestNestedRpcPage } from './content/rest-nested-rpc';
import { RestErrorsPage } from './content/rest-errors';
import { TablesMigrationsPage } from './content/tables-migrations';
import { RlsPage } from './content/rls';
import { KeysPage } from './content/keys';
import { VectorsPage } from './content/vectors';
import { HostingPage } from './content/hosting';
import { DashboardTourPage } from './content/dashboard-tour';
import { TodoRlsPage } from './content/todo-rls';
import { LiveChatPage } from './content/live-chat';
import { AvatarGalleryPage } from './content/avatar-gallery';
import { SemanticSearchPage } from './content/semantic-search';
import { CheatSheetPage } from './content/cheat-sheet';
import { LimitationsPage } from './content/limitations';

export type DocEntry = {
  title: string;
  description: string;
  toc: TocItem[];
  render: () => ReactNode;
};

export const DOC_REGISTRY: Record<string, DocEntry> = {
  'getting-started/introduction': IntroductionPage,
  'getting-started/quickstart': QuickstartPage,
  frameworks: FrameworksOverviewPage,
  'frameworks/nextjs': NextjsGuidePage,
  'frameworks/react': ReactGuidePage,
  'frameworks/vue': VueGuidePage,
  'frameworks/nuxt': NuxtGuidePage,
  'frameworks/sveltekit': SveltekitGuidePage,
  'frameworks/astro': AstroGuidePage,
  'frameworks/expo': ExpoGuidePage,
  'frameworks/hono': HonoGuidePage,
  'javascript/install': InstallPage,
  'javascript/database': DatabasePage,
  'javascript/auth': AuthPage,
  'javascript/storage': StoragePage,
  'javascript/realtime': RealtimePage,
  'rest/overview': RestOverviewPage,
  'rest/crud': RestCrudPage,
  'rest/nested-rpc': RestNestedRpcPage,
  'rest/errors': RestErrorsPage,
  'database/tables-migrations': TablesMigrationsPage,
  'database/rls': RlsPage,
  'database/keys': KeysPage,
  'database/vectors': VectorsPage,
  hosting: HostingPage,
  'dashboard/tour': DashboardTourPage,
  'examples/todo-rls': TodoRlsPage,
  'examples/live-chat': LiveChatPage,
  'examples/avatar-gallery': AvatarGalleryPage,
  'examples/semantic-search': SemanticSearchPage,
  'reference/cheat-sheet': CheatSheetPage,
  'reference/limitations': LimitationsPage,
};

export function getDocEntry(slug: string): DocEntry | null {
  return DOC_REGISTRY[slug] ?? null;
}
