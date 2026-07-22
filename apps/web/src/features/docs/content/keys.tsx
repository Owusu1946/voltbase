import type { DocEntry } from '../registry';

export const KeysPage: DocEntry = {
  title: 'Keys & roles',
  description: 'Anon vs service role, rotation, and when to use each.',
  toc: [
    { id: 'roles', title: 'Key roles' },
    { id: 'rotate', title: 'Rotation' },
  ],
  render: () => (
    <>
      <h2 id="roles">Key roles</h2>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Use for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Anon</td>
            <td>Browser apps, reads, realtime; writes with user JWT + RLS</td>
          </tr>
          <tr>
            <td>Service role</td>
            <td>Servers, admin scripts, bucket create/delete, RLS bypass</td>
          </tr>
        </tbody>
      </table>

      <h2 id="rotate">Rotation</h2>
      <p>
        On the dashboard API page, click <strong>Rotate</strong> next to a key.
        Copy the new value immediately — the previous JWT stops working once
        the version increments. Legacy keys without a version claim still work
        until rotated.
      </p>
    </>
  ),
};
