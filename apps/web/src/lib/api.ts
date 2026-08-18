/** Tiny typed fetch wrapper for the Material Retail API. */

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body && (body.message || body.error)) || `Request failed with ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface MerchantSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  ownerName: string;
  alertEmail: string;
  defaultThreshold: number;
  summary?: {
    products: number;
    variants: number;
    inventory_rows: number;
    low_stock: number;
    openAlerts: number;
  };
  recentAlerts?: Alert[];
}

export interface MerchantListItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  ownerName: string;
  alertEmail: string;
  defaultThreshold: number;
}

export interface ProductListItem {
  id: string;
  merchantId: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  variantCount: number;
  totalStock: number;
  maxThreshold: number;
  hasLowStock: boolean;
  updatedAt: string | null;
}

export interface ProductListResult {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductDetailVariant {
  id: string;
  name: string;
  attributes: Record<string, string>;
  stockQty: number;
  threshold: number;
  hasLowStock: boolean;
  updatedAt: string | null;
}

export interface ProductDetail {
  product: {
    id: string;
    merchantId: string;
    merchantSlug: string;
    merchantName: string;
    name: string;
    sku: string | null;
    category: string | null;
    description: string | null;
  };
  variants: ProductDetailVariant[];
}

export interface Alert {
  id: string;
  merchantId: string;
  merchantName?: string;
  variantId: string;
  productId?: string;
  productName?: string;
  variantName?: string;
  attributes?: Record<string, string>;
  stockQty: number;
  threshold: number;
  sentAt: string;
  channel: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  payload?: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
  actor: string;
  createdAt: string;
}

export const api = {
  listMerchants: () => request<MerchantListItem[]>('/merchants'),
  getMerchant: (slug: string) => request<MerchantSummary>(`/merchants/${slug}`),

  listProducts: (slug: string, opts: { search?: string; category?: string; lowStock?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.search) params.set('search', opts.search);
    if (opts.category) params.set('category', opts.category);
    if (opts.lowStock) params.set('low_stock', 'true');
    if (opts.page) params.set('page', String(opts.page));
    if (opts.pageSize) params.set('pageSize', String(opts.pageSize));
    return request<ProductListResult>(`/merchants/${slug}/products?${params.toString()}`);
  },
  listCategories: (slug: string) => request<string[]>(`/merchants/${slug}/categories`),
  getProduct: (id: string) => request<ProductDetail>(`/products/${id}`),
  createProduct: (body: Record<string, unknown>) => request<{ id: string }>(`/products`, { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Record<string, unknown>) => request<{ ok: true }>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request<{ ok: true }>(`/products/${id}`, { method: 'DELETE' }),

  createVariant: (productId: string, body: Record<string, unknown>) =>
    request<{ id: string }>(`/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(body) }),
  updateVariant: (id: string, body: Record<string, unknown>) =>
    request<{ ok: true }>(`/variants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteVariant: (id: string) => request<{ ok: true }>(`/variants/${id}`, { method: 'DELETE' }),

  getInventory: (variantId: string) =>
    request<{
      id: string; variantId: string; variantName: string; attributes: Record<string, string>;
      productId: string; productName: string;
      stockQty: number; threshold: number;
      belowThresholdSince: string | null;
      lastAlertedAt: string | null;
      updatedAt: string;
    }>(`/inventory/${variantId}`),
  updateInventory: (variantId: string, body: { stockQty?: number; threshold?: number }) =>
    request<unknown>(`/inventory/${variantId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adjustInventory: (variantId: string, delta: number) =>
    request<unknown>(`/inventory/${variantId}/adjust`, { method: 'POST', body: JSON.stringify({ delta }) }),

  listAlerts: (slug: string, opts: { onlyOpen?: boolean } = {}) =>
    request<Alert[]>(`/alerts?merchant_slug=${encodeURIComponent(slug)}${opts.onlyOpen ? '&only_open=true' : ''}`),
  lowStock: (slug: string) => request<Alert[]>(`/alerts/low-stock?merchant_slug=${encodeURIComponent(slug)}`),
  ackAlert: (id: string) => request<Alert>(`/alerts/${id}/ack`, { method: 'POST' }),

  listAudit: (slug: string) => request<AuditEntry[]>(`/merchants/${slug}/audit`),
};
