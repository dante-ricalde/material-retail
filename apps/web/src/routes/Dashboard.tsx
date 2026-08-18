import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Alert, MerchantSummary } from '../lib/api';
import { LowStockRow } from '../components/LowStockRow';

type Context = { slug: string; merchant?: MerchantSummary; lowStock: Alert[] };

export function Dashboard() {
  const { slug, merchant, lowStock } = useOutletContext<Context>();
  const alertsQ = useQuery({
    queryKey: ['alerts', slug, 'recent'],
    queryFn: () => api.listAlerts(slug),
    refetchInterval: 30_000,
  });

  const recent = (alertsQ.data ?? []).slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>{merchant ? `${merchant.summary?.products ?? 0} products · ${merchant.summary?.variants ?? 0} variants` : ''}</p>
        </div>
      </div>

      <div className="grid cards-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Low-stock variants</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 4 }}>
            {merchant?.summary?.low_stock ?? 0}
          </div>
          <Link to={`/m/${slug}/products?low_stock=true`} style={{ fontSize: '0.85rem' }}>View all</Link>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Open alerts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 4 }}>
            {merchant?.summary?.openAlerts ?? 0}
          </div>
          <Link to={`/m/${slug}/alerts`} style={{ fontSize: '0.85rem' }}>View history</Link>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Default threshold</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 4 }}>
            {merchant?.defaultThreshold ?? 5}
          </div>
          <Link to={`/m/${slug}/settings`} style={{ fontSize: '0.85rem' }}>Edit</Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.2fr)', gap: '1rem' }}>
        <div className="card">
          <div className="row between" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Low-stock now</h3>
            <Link to={`/m/${slug}/products?low_stock=true`} style={{ fontSize: '0.85rem' }}>
              Manage products →
            </Link>
          </div>
          {lowStock.length === 0 && (
            <div className="empty">
              <h3>Nothing low</h3>
              <p>No variants are at or below threshold. Nice work.</p>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="grid" style={{ gap: '0.5rem' }}>
              {lowStock.slice(0, 6).map((a) => (
                <LowStockRow
                  key={a.id}
                  alert={a}
                  onOpen={() => (window.location.href = `/m/${slug}/products/${a.productId}`)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Recent alerts</h3>
            <Link to={`/m/${slug}/alerts`} style={{ fontSize: '0.85rem' }}>View all →</Link>
          </div>
          {alertsQ.isLoading && <div className="row"><span className="spinner" /> Loading…</div>}
          {recent.length === 0 && !alertsQ.isLoading && (
            <div style={{ color: 'var(--text-muted)' }}>No alerts yet. We only alert when something crosses its threshold.</div>
          )}
          {recent.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recent.map((a) => (
                <li
                  key={a.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    padding: '0.55rem 0',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{a.productName}{a.variantName ? ` · ${a.variantName}` : ''}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {a.acknowledgedAt && <span className="badge ok">Acked</span>}{' '}
                    {a.resolvedAt && <span className="badge ok">Resolved</span>}{' '}
                    stock {a.stockQty} / threshold {a.threshold} · {new Date(a.sentAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
