import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { LowStockRow } from './LowStockRow';

export function LowStockDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['lowStock', slug],
    queryFn: () => api.lowStock(slug),
    enabled: open && !!slug,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Low stock alerts"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          width: 'min(440px, 100%)',
          height: '100%',
          padding: '1.25rem',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="row between" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>⏰ Low-stock alerts</h2>
          <button className="ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!data && (
          <div className="row" style={{ color: 'var(--text-muted)' }}>
            <span className="spinner" /> Loading…
          </div>
        )}

        {data && data.length === 0 && (
          <div className="empty">
            <h3>All caught up 🎉</h3>
            <p>No items are at or below their reorder threshold.</p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="grid" style={{ gap: '0.6rem' }}>
            {data.map((a) => (
              <LowStockRow key={a.id} alert={a} onOpen={() => { onClose(); navigate(`/m/${slug}/products/${a.productId}`); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
