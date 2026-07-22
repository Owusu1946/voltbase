import type { DocEntry } from '../registry';

export const DashboardTourPage: DocEntry = {
  title: 'Product tour',
  description: 'A map of the Voltbase dashboard for each project.',
  toc: [{ id: 'map', title: 'Sidebar map' }],
  render: () => (
    <>
      <h2 id="map">Sidebar map</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Database</td>
            <td>Table editor, rows, indexes (incl. HNSW), FKs, unique, RLS policies</td>
          </tr>
          <tr>
            <td>Extensions</td>
            <td>Postgres extensions (pgvector for embeddings)</td>
          </tr>
          <tr>
            <td>SQL</td>
            <td>Ad-hoc queries + history</td>
          </tr>
          <tr>
            <td>Migrations</td>
            <td>Versioned SQL apply + history</td>
          </tr>
          <tr>
            <td>Auth</td>
            <td>Providers, site URL, project users</td>
          </tr>
          <tr>
            <td>Storage</td>
            <td>Buckets and files</td>
          </tr>
          <tr>
            <td>Hosting</td>
            <td>Import GitHub → deploy to Cloudflare Pages (Vercel-style)</td>
          </tr>
          <tr>
            <td>API</td>
            <td>Project URL, anon/service keys, rotate, table curl examples</td>
          </tr>
          <tr>
            <td>Realtime</td>
            <td>Enable tables, watch CDC, optional filters</td>
          </tr>
        </tbody>
      </table>
      <p>
        Org settings (rename/delete, members) live under organization Settings —
        separate from the project sidebar.
      </p>
    </>
  ),
};
