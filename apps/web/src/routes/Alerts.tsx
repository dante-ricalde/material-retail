import { Link, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import type { Alert, MerchantSummary } from '../lib/api';

type Context = { slug: string; merchant?: MerchantSummary };

export function Alerts() {
  const { slug } = useOutletContext<Context>();
  const [onlyOpen, setOnlyOpen] = useState(true);
  const qc = useQueryClient();

  const alertsQ = useQuery({
    queryKey: ['alerts', slug, onlyOpen],
    queryFn: () => api.listAlerts(slug, { onlyOpen }),
    refetchInterval: 15_000,
  });

  const ack = useMutation({
    mutationFn: (id: string) => api.ackAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['lowStock'] });
    },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Alert history</h1>
          <p>Alerts when stock fell below each variant's reorder threshold.</p>
        </div>
        <div className="row">
          <label className="row" style={{ gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Open only
          </label>
        </div>
      </div>

      {alertsQ.isLoading && <div className="row"><span className="spinner" /> Loading alerts…</div>}
      {alertsQ.error && <div className="error">Could not load alerts.</div>}
      {alertsQ.data && alertsQ.data.length === 0 && (
        <div className="empty">
          <h3>No alerts</h3>
          <p>{onlyOpen ? 'Nothing is below its threshold right now.' : 'No alerts have ever fired for this merchant.'}</p>
        </div>
      )}

      {alertsQ.data && alertsQ.data.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Product</th>
                <th>Variant</th>
                <th>Stock</th>
                <th>Channel</th>
                <th>State</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alertsQ.data.map((a) => (
                <AlertRow key={a.id} a={a} slug={slug} onAck={() => ack.mutate(a.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Note: alert emails land in <code>data/outbox/</code> as <code>.eml</code> files
        (Nodemailer <code>jsonTransport</code>) so you can preview them in any mail client.
      </div>
    </>
  );
}

function AlertRow({ a, slug, onAck }: { a: Alert; slug: string; onAck: () => void }) {
  const attrString = a.attributes ? Object.entries(a.attributes).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
  const state = a.resolvedAt
    ? <span className="badge ok">Resolved</span>
    : a.acknowledgedAt
    ? <span className="badge ok">Acked</span>
    : <span className="badge danger">Open</span>;
  return (
    <tr>
      <td>{new Date(a.sentAt).toLocaleString()}</td>
      <td>
        {a.productId
          ? <Link to={`/m/${slug}/products/${a.productId}`}>{a.productName}</Link>
          : a.productName}
      </td>
      <td style={{ color: 'var(--text-muted)' }}>
        {a.variantName}{attrString ? ` · ${attrString}` : ''}
      </td>
      <td><strong>{a.stockQty}</strong> / {a.threshold}</td>
      <td><span className="badge">{a.channel}</span></td>
      <td>{state}</td>
      <td>
        {!a.acknowledgedAt && !a.resolvedAt && (
          <button onClick={onAck}>Acknowledge</button>
        )}
      </td>
    </tr>
  );
}
