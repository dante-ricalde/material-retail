import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { CreateVariantDto, UpdateVariantDto } from './variants.dto';

@Injectable()
export class VariantsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  create(dto: CreateVariantDto): { id: string } {
    const productRow = this.db
      .prepare(`SELECT merchant_id FROM products WHERE id = ?`)
      .get(dto.productId) as { merchant_id: string } | undefined;
    if (!productRow) throw new NotFoundException(`Product not found: ${dto.productId}`);

    const merchantId = productRow.merchant_id;
    const merchant = this.db
      .prepare(`SELECT default_threshold FROM merchants WHERE id = ?`)
      .get(merchantId) as { default_threshold: number };

    const variantId = nanoid();
    const now = new Date().toISOString();
    this.db.tx(() => {
      this.db
        .prepare(
          `INSERT INTO product_variants (id, product_id, name, attributes_json, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(variantId, dto.productId, dto.name, JSON.stringify(dto.attributes ?? {}), now);

      const stock = dto.stock ?? 0;
      const threshold = dto.threshold ?? merchant.default_threshold;
      this.db
        .prepare(
          `INSERT INTO inventory (id, variant_id, stock_qty, threshold, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(nanoid(), variantId, stock, threshold, now);
    });

    this.audit.record({
      merchantId,
      actor: 'user',
      action: 'variant.created',
      targetType: 'variant',
      targetId: variantId,
      payload: { productId: dto.productId, name: dto.name, stock: dto.stock ?? 0 },
    });

    return { id: variantId };
  }

  update(variantId: string, dto: UpdateVariantDto): { ok: true } {
    const row = this.db
      .prepare(
        `SELECT v.id, p.merchant_id, v.name, v.attributes_json
           FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`,
      )
      .get(variantId) as
      | { id: string; merchant_id: string; name: string; attributes_json: string }
      | undefined;
    if (!row) throw new NotFoundException(`Variant not found: ${variantId}`);

    const fields: string[] = [];
    const params: unknown[] = [];
    if (dto.name !== undefined) {
      fields.push('name = ?');
      params.push(dto.name);
    }
    if (dto.attributes !== undefined) {
      fields.push('attributes_json = ?');
      params.push(JSON.stringify(dto.attributes));
    }
    if (fields.length === 0) return { ok: true };
    params.push(variantId);
    this.db.prepare(`UPDATE product_variants SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    this.audit.record({
      merchantId: row.merchant_id,
      actor: 'user',
      action: 'variant.updated',
      targetType: 'variant',
      targetId: variantId,
      payload: { ...dto },
    });

    return { ok: true };
  }

  remove(variantId: string): { ok: true } {
    const row = this.db
      .prepare(
        `SELECT p.merchant_id
           FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`,
      )
      .get(variantId) as { merchant_id: string } | undefined;
    if (!row) throw new NotFoundException(`Variant not found: ${variantId}`);
    this.db.prepare(`DELETE FROM product_variants WHERE id = ?`).run(variantId);
    this.audit.record({
      merchantId: row.merchant_id,
      actor: 'user',
      action: 'variant.deleted',
      targetType: 'variant',
      targetId: variantId,
      payload: {},
    });
    return { ok: true };
  }
}
