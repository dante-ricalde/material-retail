import type { Alert } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function LowStockRow({ alert: a, onOpen }: { alert: Alert; onOpen: () => void }) {
  const qc = useQueryClient();
  const ack = useMutation({
    mutationFn: () => api.ackAlert(a.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lowStock'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const attributes = a.attributes
    ? Object.entries(a.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
    : '';

  return (
    <div
      className="card"
      style={{
        padding: '0.7rem 0.9rem',
        borderLeft: '4px solid var(--danger)',
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
      <div className="row between">
        <strong>{a.productName ?? 'Unknown product'}</strong>
        {a.acknowledgedAt && <span className="badge ok">Acked</span>}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
        {a.variantName}
        {attributes ? ` · ${attributes}` : ''}
      </div>
      <div className="row between" style={{ marginTop: 8 }}>
        <span className="badge danger">
          Stock {a.stockQty} / threshold {a.threshold}
        </span>
        {!a.acknowledgedAt && (
          <button
            className="ghost"
            onClick={(e) => {
              e.stopPropagation();
              ack.mutate();
            }}
            disabled={ack.isPending}
          >
            Acknowledge
          </button>
        )}
      </div>
    </div>
  );
}
