import { MembersClient } from './members-client';

export default async function MembersSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-medium">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who has access to {'ORGANIZATION NAME'}
        </p>
      </div>
      <MembersClient />
    </div>
  );
}
