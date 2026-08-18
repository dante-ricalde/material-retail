import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function MerchantPicker() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['merchants'],
    queryFn: api.listMerchants,
  });

  return (
    <div className="shell">
      <main className="container">
        <div className="page-header">
          <div>
            <h1>Material Retail</h1>
            <p>Choose a merchant to manage inventory.</p>
          </div>
        </div>

        {error && <div className="error">Could not reach the API. Is it running on :4000?</div>}
        {isLoading && <div className="row"><span className="spinner" /> Loading merchants…</div>}

        {data && data.length === 0 && (
          <div className="empty">
            <h3>No merchants yet</h3>
            <p>Run <code>npm run seed</code> to populate the demo data.</p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="grid cards-3">
            {data.map((m) => (
              <Link
                key={m.id}
                to={`/m/${m.slug}`}
                className="card"
                style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{m.name}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.85rem' }}>
                  {m.category} · {m.ownerName}
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Default threshold: <b>{m.defaultThreshold}</b>
                  </span>
                  <span style={{ color: 'var(--accent)' }}>Enter →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <h3 style={{ color: 'var(--text)', marginBottom: '0.4rem' }}>Two demo merchants, two personas</h3>
          <ul>
            <li><b>Aquarius Cosmetics</b> — nail polish variants, popular colors flagged for low stock, day-to-day user Ashley</li>
            <li><b>Mountain House</b> — furniture &amp; decor; Brooklyn Tripod Lamp is the famous must-not-stock-out</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
