import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AuditEntry, MerchantSummary } from '../lib/api';

type Context = { slug: string; merchant?: MerchantSummary };

export function Settings() {
  const { slug, merchant } = useOutletContext<Context>();
  const auditQ = useQuery({
    queryKey: ['audit', slug],
    queryFn: () => api.listAudit(slug),
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings &amp; Audit</h1>
          <p>Read-only for the demo; edits are wired through the API.</p>
        </div>
      </div>

      <div className="grid cards-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: '1rem' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Merchant profile</h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Name</div>
            <div><b>{merchant?.name}</b></div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Owner</div>
            <div>{merchant?.ownerName}</div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Alert email</div>
            <div><code>{merchant?.alertEmail}</code></div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Default threshold</div>
            <div>{merchant?.defaultThreshold}</div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            For the demo, these are read-only. In a real deployment you'd add a form here
            to update them.
          </p>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Audit log</h3>
          {auditQ.isLoading && <div className="row"><span className="spinner" /> Loading…</div>}
          {auditQ.data && auditQ.data.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No audit entries yet.</div>
          )}
          {auditQ.data && auditQ.data.length > 0 && (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditQ.data.map((row: AuditEntry) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(row.createdAt).toLocaleString()}</td>
                      <td><code>{row.action}</code></td>
                      <td><code>{row.targetType}:{row.targetId.slice(0, 6)}…</code></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {Object.entries(row.payload).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
