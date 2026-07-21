import { retrieveOrganizationBySlugFromApi } from '@/features/organization/organization-helpers.server';
import { retrieveProjectsFromApi } from '@/features/projects/project-helpers.server';
import { ORG_ROLES } from '@voltbase/constants';
import { CreateProjectModal } from '@/features/projects/create-project-modal';
import { ProjectsList } from '@/features/projects/projects-list';

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [org, projects] = await Promise.all([
    retrieveOrganizationBySlugFromApi(slug),
    retrieveProjectsFromApi(slug),
  ]);

  const isAdmin = org.role === ORG_ROLES.ADMIN;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        {isAdmin && <CreateProjectModal slug={slug} />}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-sm text-muted-foreground">
            No projects yet in {org.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <ProjectsList slug={slug} projects={projects} isAdmin={isAdmin} />
      )}
    </div>
  );
}
