import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Alert, MerchantSummary } from '../lib/api';

type Context = { slug: string; merchant?: MerchantSummary; lowStock: Alert[] };

export function ProductList() {
  const { slug } = useOutletContext<Context>();
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(Number(params.get('page') ?? 1) || 1);

  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const lowStock = params.get('low_stock') === 'true';

  const productsQ = useQuery({
    queryKey: ['products', slug, { search, category, lowStock, page }],
    queryFn: () => api.listProducts(slug, { search, category, lowStock, page, pageSize: 25 }),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });

  const categoriesQ = useQuery({
    queryKey: ['categories', slug],
    queryFn: () => api.listCategories(slug),
    enabled: !!slug,
  });

  const apply = (next: Partial<{ search: string; category: string; lowStock: boolean; page: number }>) => {
    const merged = {
      search: next.search ?? search,
      category: next.category ?? category,
      lowStock: next.lowStock ?? lowStock,
      page: next.page ?? 1,
    };
    const sp = new URLSearchParams();
    if (merged.search) sp.set('search', merged.search);
    if (merged.category) sp.set('category', merged.category);
    if (merged.lowStock) sp.set('low_stock', 'true');
    if (merged.page) sp.set('page', String(merged.page));
    setParams(sp);
    setPage(merged.page);
  };

  const total = productsQ.data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 25)), [total]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>{total.toLocaleString()} products match your filters.</p>
        </div>
        <Link to="new" className="primary" style={{
          background: 'var(--accent)', color: 'var(--accent-contrast)', padding: '0.5rem 0.9rem', borderRadius: 'var(--radius)',
        }}>+ New product</Link>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="row wrap gap-1">
          <input
            placeholder="Search products (name or SKU)…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply({ search: searchInput });
            }}
            style={{ flex: 1, minWidth: '220px' }}
          />
          <select
            value={category}
            onChange={(e) => apply({ category: e.target.value, page: 1 })}
            style={{ width: 'auto' }}
          >
            <option value="">All categories</option>
            {(categoriesQ.data ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="row" style={{ gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => apply({ lowStock: e.target.checked, page: 1 })}
              style={{ width: 'auto' }}
            />
            Low stock only
          </label>
          <button onClick={() => apply({ search: searchInput })}>Search</button>
          {(search || category || lowStock) && (
            <button
              className="ghost"
              onClick={() => {
                setSearchInput('');
                apply({ search: '', category: '', lowStock: false });
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {productsQ.isLoading && <div className="row"><span className="spinner" /> Loading products…</div>}
      {productsQ.error && <div className="error">Could not load products.</div>}

      {productsQ.data && productsQ.data.items.length === 0 && (
        <div className="empty">
          <h3>No products match</h3>
          <p>Try removing filters or creating a new product.</p>
        </div>
      )}

      {productsQ.data && productsQ.data.items.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {productsQ.data.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/m/${slug}/products/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link>
                    {p.description && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{p.description}</div>
                    )}
                  </td>
                  <td><code>{p.sku ?? '—'}</code></td>
                  <td>{p.category ?? '—'}</td>
                  <td>{p.variantCount}</td>
                  <td>{p.totalStock}</td>
                  <td>
                    {p.hasLowStock ? (
                      <span className="badge danger">Low</span>
                    ) : (
                      <span className="badge ok">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {productsQ.data && totalPages > 1 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: '1rem', gap: '0.5rem' }}>
          <button disabled={page <= 1} onClick={() => apply({ page: page - 1 })}>← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => apply({ page: page + 1 })}>Next →</button>
        </div>
      )}
    </>
  );
}
