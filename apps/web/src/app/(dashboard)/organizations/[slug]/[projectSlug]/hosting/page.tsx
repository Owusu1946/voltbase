import { HostingClient } from '@/features/hosting/hosting-client';
import { getHostingStatusAction } from '@/features/hosting/actions';

export default async function HostingPage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug, projectSlug } = await params;
  const result = await getHostingStatusAction(slug, projectSlug);
  const initial = result.ok
    ? result.data
    : {
        configured: false,
        githubConnected: false,
        githubLogin: null,
        githubOAuthConfigured: false,
        nearCap: false,
        projectCount: null,
        softCap: 95,
        rootDomain: 'apps.voltbase.dev',
        site: null,
        env: [],
        deployments: [],
      };

  return (
    <HostingClient
      orgSlug={slug}
      projectSlug={projectSlug}
      initial={initial}
    />
  );
}
