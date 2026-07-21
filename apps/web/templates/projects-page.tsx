import Link from 'next/link';
import { Database, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function ProjectsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">Projects</h1>
        <Button size="sm">
          <Plus size={14} className="mr-1.5" />
          New project
        </Button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
        <p className="text-muted-foreground text-sm">
          No projects yet in {'ORGANIZATION NAME'}
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Create your first project to get started
        </p>
      </div>

      {/* Projects grid — wire up when API is connected
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/organizations/org-slug/project-slug/database"
          className="flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:bg-accent transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Database size={18} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{'PROJECT NAME'}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              http://localhost:3000/api/projects/project-slug
            </p>
          </div>
        </Link>
      </div>
      */}
    </div>
  );
}
