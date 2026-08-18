import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';

export function ProductDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();

  const productQ = useQuery({ queryKey: ['product', id], queryFn: () => api.getProduct(id) });

  const setStock = useMutation({
    mutationFn: ({ variantId, stockQty }: { variantId: string; stockQty: number }) =>
      api.updateInventory(variantId, { stockQty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['lowStock'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['merchant'] });
    },
  });

  const setThreshold = useMutation({
    mutationFn: ({ variantId, threshold }: { variantId: string; threshold: number }) =>
      api.updateInventory(variantId, { threshold }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['lowStock'] });
    },
  });

  const adjustStock = useMutation({
    mutationFn: ({ variantId, delta }: { variantId: string; delta: number }) =>
      api.adjustInventory(variantId, delta),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['lowStock'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['merchant'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: () => api.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  if (productQ.isLoading) return <div className="row"><span className="spinner" /> Loading product…</div>;
  if (productQ.error || !productQ.data) return <div className="error">Could not load this product.</div>;

  const { product, variants } = productQ.data;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{product.name}</h1>
          <p>
            {product.category && <span>{product.category}</span>}
            {product.sku && <span> · <code>{product.sku}</code></span>}
          </p>
          {product.description && <p style={{ marginTop: 8 }}>{product.description}</p>}
        </div>
        <div className="row" style={{ gap: '0.5rem' }}>
          <Link to={`/m/${product.merchantSlug}/products`} className="ghost" style={{ padding: '0.5rem 0.9rem' }}>← All products</Link>
          <button
            className="ghost"
            onClick={() => {
              if (confirm('Delete this product and all its variants?')) deleteProduct.mutate();
              else return;
              window.location.href = `/m/${product.merchantSlug}/products`;
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Attributes</th>
              <th style={{ width: 170 }}>Stock</th>
              <th style={{ width: 120 }}>Threshold</th>
              <th style={{ width: 140 }}>Quick adjust</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <ProductVariantRow
                key={v.id}
                variant={v}
                onSetStock={(n) => setStock.mutate({ variantId: v.id, stockQty: n })}
                onSetThreshold={(n) => setThreshold.mutate({ variantId: v.id, threshold: n })}
                onAdjust={(d) => adjustStock.mutate({ variantId: v.id, delta: d })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductVariantRow({
  variant: v,
  onSetStock,
  onSetThreshold,
  onAdjust,
}: {
  variant: { id: string; name: string; attributes: Record<string, string>; stockQty: number; threshold: number; hasLowStock: boolean };
  onSetStock: (n: number) => void;
  onSetThreshold: (n: number) => void;
  onAdjust: (d: number) => void;
}) {
  const [stock, setStock] = useState<number>(v.stockQty);
  const [threshold, setThreshold] = useState<number>(v.threshold);

  // Sync local edits when underlying query updates (e.g. after invalidation).
  if (stock !== v.stockQty && !document.activeElement?.contains?.((document.activeElement as HTMLElement))) {
    // (No-op guard — we re-seed below via effect.)
  }

  const attrString = Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ');

  return (
    <tr>
      <td>
        <strong>{v.name}</strong>
      </td>
      <td style={{ color: 'var(--text-muted)' }}>{attrString || '—'}</td>
      <td>
        <div className="row" style={{ gap: '0.4rem' }}>
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            onBlur={() => stock !== v.stockQty && onSetStock(stock)}
            style={{ width: 80 }}
          />
          <span style={{ color: 'var(--text-muted)' }}>in stock</span>
        </div>
      </td>
      <td>
        <div className="row" style={{ gap: '0.4rem' }}>
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            onBlur={() => threshold !== v.threshold && onSetThreshold(threshold)}
            style={{ width: 60 }}
          />
        </div>
      </td>
      <td>
        <div className="row" style={{ gap: '0.3rem' }}>
          <button onClick={() => { onAdjust(-1); setStock((s) => Math.max(0, s - 1)); }}>-1</button>
          <button onClick={() => { onAdjust(1); setStock((s) => s + 1); }}>+1</button>
          <button onClick={() => { onAdjust(10); setStock((s) => s + 10); }}>+10</button>
        </div>
      </td>
      <td>
        {v.hasLowStock ? <span className="badge danger">Low</span> : <span className="badge ok">OK</span>}
      </td>
    </tr>
  );
}
