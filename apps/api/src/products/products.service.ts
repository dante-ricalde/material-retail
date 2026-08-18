import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { resolveMerchantBySlug, findMerchantBySlug } from '../common/merchants';
import { CreateProductDto, UpdateProductDto } from './products.dto';

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

@Injectable()
export class ProductsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  list(merchantSlug: string, opts: { search?: string; category?: string; lowStock?: boolean; page?: number; pageSize?: number } = {}): {
    items: ProductListItem[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const m = resolveMerchantBySlug(merchantSlug);
    const page = Math.max(1, Number(opts.page ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize ?? 25) || 25));
    const offset = (page - 1) * pageSize;

    const where: string[] = ['p.merchant_id = ?'];
    const params: unknown[] = [m.id];

    if (opts.search) {
      where.push('(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?)');
      const q = `%${opts.search.toLowerCase()}%`;
      params.push(q, q);
    }
    if (opts.category) {
      where.push('p.category = ?');
      params.push(opts.category);
    }
    const sqlBase = `
      SELECT
        p.id, p.merchant_id, p.name, p.sku, p.category, p.description,
        (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count,
        COALESCE(SUM(i.stock_qty), 0) AS total_stock,
        COALESCE(MAX(i.threshold), 0) AS max_threshold,
        MAX(i.updated_at) AS updated_at
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN inventory i ON i.variant_id = v.id
      WHERE ${where.join(' AND ')}
      GROUP BY p.id
      ${opts.lowStock ? 'HAVING COALESCE(MAX(i.threshold), 0) > 0 AND COALESCE(SUM(i.stock_qty), 0) <= COALESCE(MAX(i.threshold), 0)' : ''}
    `;

    const totalRow = this.db
      .prepare(
        `SELECT COUNT(*) AS c FROM products p WHERE ${
          opts.search ? '(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?) AND ' : ''
        }p.merchant_id = ?${opts.category ? ' AND p.category = ?' : ''}`,
      )
      .get(
        ...(opts.search ? [`%${opts.search.toLowerCase()}%`, `%${opts.search.toLowerCase()}%`] : []),
        m.id,
        ...(opts.category ? [opts.category] : []),
      ) as { c: number };

    // When lowStock is requested, the count must reflect only products where
    // total stock <= max threshold (with at least one variant/inventory row).
    let total = totalRow.c;
    if (opts.lowStock) {
      const lowCountRow = this.db
        .prepare(
          `SELECT COUNT(*) AS c FROM (
            SELECT p.id
            FROM products p
            JOIN product_variants v ON v.product_id = p.id
            LEFT JOIN inventory i ON i.variant_id = v.id
            WHERE p.merchant_id = ?
            GROUP BY p.id
            HAVING COALESCE(MAX(i.threshold), 0) > 0
               AND COALESCE(SUM(i.stock_qty), 0) <= COALESCE(MAX(i.threshold), 0)
          )`,
        )
        .get(m.id) as { c: number };
      total = lowCountRow.c;
    }

    const rows = this.db.prepare(`${sqlBase} ORDER BY p.name LIMIT ? OFFSET ?`).all(
      ...params,
      pageSize,
      offset,
    ) as Array<{
      id: string;
      merchant_id: string;
      name: string;
      sku: string | null;
      category: string | null;
      description: string | null;
      variant_count: number;
      total_stock: number;
      max_threshold: number;
      updated_at: string | null;
    }>;

    const items: ProductListItem[] = rows
      .map((r) => ({
        id: r.id,
        merchantId: r.merchant_id,
        name: r.name,
        sku: r.sku,
        category: r.category,
        description: r.description,
        variantCount: r.variant_count,
        totalStock: r.total_stock,
        maxThreshold: r.max_threshold,
        hasLowStock:
          r.max_threshold > 0 && r.total_stock <= r.max_threshold && r.variant_count > 0,
        updatedAt: r.updated_at,
      }));

    return { items, total, page, pageSize };
  }

  categories(merchantSlug: string): string[] {
    const m = resolveMerchantBySlug(merchantSlug);
    const rows = this.db
      .prepare(
        `SELECT DISTINCT category FROM products WHERE merchant_id = ? AND category IS NOT NULL ORDER BY category`,
      )
      .all(m.id) as Array<{ category: string }>;
    return rows.map((r) => r.category);
  }

  detail(productId: string): {
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
    variants: Array<{
      id: string;
      name: string;
      attributes: Record<string, string>;
      stockQty: number;
      threshold: number;
      hasLowStock: boolean;
      updatedAt: string | null;
    }>;
  } {
    const row = this.db
      .prepare(
        `SELECT p.*, m.slug AS merchant_slug, m.name AS merchant_name
           FROM products p JOIN merchants m ON m.id = p.merchant_id WHERE p.id = ?`,
      )
      .get(productId) as
      | {
          id: string;
          merchant_id: string;
          merchant_slug: string;
          merchant_name: string;
          name: string;
          sku: string | null;
          category: string | null;
          description: string | null;
        }
      | undefined;

    if (!row) throw new NotFoundException(`Product not found: ${productId}`);

    const variants = this.db
      .prepare(
        `SELECT v.id, v.name, v.attributes_json, i.stock_qty, i.threshold, i.updated_at
           FROM product_variants v
           LEFT JOIN inventory i ON i.variant_id = v.id
          WHERE v.product_id = ?
          ORDER BY v.name`,
      )
      .all(productId)
      .map((r) => {
        const rec = r as {
          id: string;
          name: string;
          attributes_json: string;
          stock_qty: number | null;
          threshold: number | null;
          updated_at: string | null;
        };
        let attributes: Record<string, string> = {};
        try {
          attributes = JSON.parse(rec.attributes_json || '{}');
        } catch {
          // ignore
        }
        const stock = rec.stock_qty ?? 0;
        const threshold = rec.threshold ?? 0;
        return {
          id: rec.id,
          name: rec.name,
          attributes,
          stockQty: stock,
          threshold,
          hasLowStock: threshold > 0 && stock <= threshold,
          updatedAt: rec.updated_at,
        };
      });

    return {
      product: {
        id: row.id,
        merchantId: row.merchant_id,
        merchantSlug: row.merchant_slug,
        merchantName: row.merchant_name,
        name: row.name,
        sku: row.sku,
        category: row.category,
        description: row.description,
      },
      variants,
    };
  }

  create(dto: CreateProductDto): { id: string } {
    const m = resolveMerchantBySlug(dto.merchantSlug);
    const productId = nanoid();
    const now = new Date().toISOString();

    this.db.tx(() => {
      this.db
        .prepare(
          `INSERT INTO products (id, merchant_id, name, sku, category, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(productId, m.id, dto.name, dto.sku ?? null, dto.category ?? null, dto.description ?? null, now);

      if (dto.initialVariant) {
        const v = dto.initialVariant;
        const variantId = nanoid();
        this.db
          .prepare(
            `INSERT INTO product_variants (id, product_id, name, attributes_json, created_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(variantId, productId, v.name, JSON.stringify(v.attributes ?? {}), now);
        const stock = v.stock ?? 0;
        const threshold = v.threshold ?? m.default_threshold;
        this.db
          .prepare(
            `INSERT INTO inventory (id, variant_id, stock_qty, threshold, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(nanoid(), variantId, stock, threshold, now);
      }
    });

    this.audit.record({
      merchantId: m.id,
      actor: 'user',
      action: 'product.created',
      targetType: 'product',
      targetId: productId,
      payload: { name: dto.name, sku: dto.sku ?? null },
    });

    return { id: productId };
  }

  update(productId: string, dto: UpdateProductDto): { ok: true } {
    const existing = this.db
      .prepare(`SELECT merchant_id FROM products WHERE id = ?`)
      .get(productId) as { merchant_id: string } | undefined;
    if (!existing) throw new NotFoundException(`Product not found: ${productId}`);

    const fields: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      fields.push(`${k} = ?`);
      params.push(v);
    }
    if (fields.length === 0) return { ok: true };
    params.push(productId);
    this.db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    this.audit.record({
      merchantId: existing.merchant_id,
      actor: 'user',
      action: 'product.updated',
      targetType: 'product',
      targetId: productId,
      payload: { ...dto },
    });

    return { ok: true };
  }

  remove(productId: string): { ok: true } {
    const existing = this.db
      .prepare(`SELECT merchant_id FROM products WHERE id = ?`)
      .get(productId) as { merchant_id: string } | undefined;
    if (!existing) throw new NotFoundException(`Product not found: ${productId}`);

    this.db.prepare(`DELETE FROM products WHERE id = ?`).run(productId);
    this.audit.record({
      merchantId: existing.merchant_id,
      actor: 'user',
      action: 'product.deleted',
      targetType: 'product',
      targetId: productId,
      payload: {},
    });

    return { ok: true };
  }
}
