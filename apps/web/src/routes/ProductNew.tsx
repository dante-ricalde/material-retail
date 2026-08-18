import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import type { MerchantSummary } from '../lib/api';

type Context = { slug: string; merchant?: MerchantSummary };

export function ProductNew() {
  const { slug, merchant } = useOutletContext<Context>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [variantName, setVariantName] = useState('Default');
  const [stock, setStock] = useState(0);
  const [threshold, setThreshold] = useState<number | ''>(merchant?.defaultThreshold ?? 5);
  const [attrKey, setAttrKey] = useState('');
  const [attrVal, setAttrVal] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.createProduct({
        merchantSlug: slug,
        name,
        sku: sku || undefined,
        category: category || undefined,
        description: description || undefined,
        initialVariant: {
          name: variantName,
          attributes: attrKey && attrVal ? { [attrKey]: attrVal } : undefined,
          stock,
          threshold: typeof threshold === 'number' ? threshold : undefined,
        },
      }),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['merchant'] });
      navigate(`/m/${slug}/products/${id}`);
    },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>New product</h1>
          <p>Add a product and its first variant.</p>
        </div>
        <Link to={`/m/${slug}/products`} className="ghost" style={{ padding: '0.5rem 0.9rem' }}>← Cancel</Link>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginTop: 0 }}>Product details</h3>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Forest Green Nail Polish" />
          </label>
          <div className="row gap-1">
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>SKU</div>
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="(optional)" />
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Category</div>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Nail Polish" />
            </label>
          </div>
          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Description</div>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(optional)" />
          </label>
        </div>

        <h3 style={{ marginTop: '1.25rem' }}>First variant</h3>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <div className="row gap-1">
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Variant name</div>
              <input value={variantName} onChange={(e) => setVariantName(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Attribute</div>
              <input value={attrKey} onChange={(e) => setAttrKey(e.target.value)} placeholder="e.g. size (5ml)" />
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Value</div>
              <input value={attrVal} onChange={(e) => setAttrVal(e.target.value)} placeholder="e.g. 5ml" />
            </label>
          </div>
          <div className="row gap-1">
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Starting stock</div>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
              />
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Reorder threshold (default {merchant?.defaultThreshold ?? '?'})
              </div>
              <input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <div className="row" style={{ marginTop: '1.25rem', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Link to={`/m/${slug}/products`} className="ghost" style={{ padding: '0.5rem 0.9rem' }}>Cancel</Link>
          <button
            className="primary"
            disabled={!name || !variantName || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Saving…' : 'Create product'}
          </button>
        </div>
      </div>
    </>
  );
}
