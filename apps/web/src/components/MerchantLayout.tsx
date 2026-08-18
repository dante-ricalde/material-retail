import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LowStockDrawer } from './LowStockDrawer';
import { useState } from 'react';

const NAV = [
  { to: '', label: 'Dashboard', end: true },
  { to: 'products', label: 'Products' },
  { to: 'alerts', label: 'Alerts' },
  { to: 'settings', label: 'Settings' },
];

export function MerchantLayout() {
  const { slug = '' } = useParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const merchantQ = useQuery({
    queryKey: ['merchant', slug],
    queryFn: () => api.getMerchant(slug),
    enabled: !!slug,
  });

  const lowStockQ = useQuery({
    queryKey: ['lowStock', slug],
    queryFn: () => api.lowStock(slug),
    enabled: !!slug,
    refetchInterval: 30_000,
  });

  const lowStockCount = lowStockQ.data?.length ?? 0;

  return (
    <div className="shell">
      <header
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1.25rem',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="row between" style={{ maxWidth: 'var(--max-w)', margin: '0 auto' }}>
          <div className="row" style={{ gap: '1.25rem' }}>
            <Link to="/" style={{ fontWeight: 700, color: 'var(--text)' }}>
              Material Retail
            </Link>
            {merchantQ.data && (
              <span style={{ color: 'var(--text-muted)' }}>· {merchantQ.data.name}</span>
            )}
          </div>
          <div className="row" style={{ gap: '0.6rem' }}>
            <button
              onClick={() => setDrawerOpen(true)}
              className={lowStockCount > 0 ? 'danger' : 'ghost'}
              aria-label="Low-stock drawer"
              title="Open low-stock drawer"
            >
              ⚠ Low stock {lowStockCount > 0 && <span style={{ marginLeft: 6 }}>({lowStockCount})</span>}
            </button>
          </div>
        </div>
        {merchantQ.data && (
          <nav
            className="row"
            style={{
              maxWidth: 'var(--max-w)',
              margin: '0.75rem auto 0',
              gap: '1.1rem',
              flexWrap: 'wrap',
            }}
          >
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                style={({ isActive }) => ({
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  paddingBottom: '0.4rem',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                })}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="container" style={{ flex: 1 }}>
        <Outlet context={{ slug, merchant: merchantQ.data, lowStock: lowStockQ.data ?? [] }} />
      </main>

      <footer className="container" style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {merchantQ.data && <span>Alert email: <code>{merchantQ.data.alertEmail}</code></span>}
      </footer>

      <LowStockDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
