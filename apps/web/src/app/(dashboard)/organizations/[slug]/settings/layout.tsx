import { retrieveOrganizationBySlugFromApi } from '@/features/organization/organization-helpers.server';
import { OrgSettingsNav } from '@/features/organization/org-settings-nav';

export default async function OrgSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await retrieveOrganizationBySlugFromApi(slug);

  return (
    <div>
      <OrgSettingsNav slug={slug} />
      {children}
    </div>
  );
}
