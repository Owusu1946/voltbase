import { retrieveOrganizationBySlugFromApi } from '@/features/organization/organization-helpers.server';
import { OrgGeneralSettings } from '@/features/organization/org-general-settings';

export default async function OrgSettingsIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await retrieveOrganizationBySlugFromApi(slug);

  return (
    <OrgGeneralSettings slug={slug} name={org.name} role={org.role} />
  );
}
