import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { AdjustInventoryDto, UpdateInventoryDto } from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
  ) {}

  get(variantId: string) {
    const row = this.db
      .prepare(
        `SELECT i.id, i.variant_id, i.stock_qty, i.threshold, i.below_threshold_since,
                i.last_alerted_at, i.updated_at, v.name AS variant_name, v.attributes_json,
                p.id AS product_id, p.name AS product_name
           FROM inventory i
           JOIN product_variants v ON v.id = i.variant_id
           JOIN products p ON p.id = v.product_id
          WHERE i.variant_id = ?`,
      )
      .get(variantId);
    if (!row) throw new NotFoundException(`Inventory not found for variant: ${variantId}`);
    const r = row as {
      id: string;
      variant_id: string;
      stock_qty: number;
      threshold: number;
      below_threshold_since: string | null;
      last_alerted_at: string | null;
      updated_at: string;
      variant_name: string;
      attributes_json: string;
      product_id: string;
      product_name: string;
    };
    return {
      id: r.id,
      variantId: r.variant_id,
      variantName: r.variant_name,
      attributes: JSON.parse(r.attributes_json || '{}'),
      productId: r.product_id,
      productName: r.product_name,
      stockQty: r.stock_qty,
      threshold: r.threshold,
      belowThresholdSince: r.below_threshold_since,
      lastAlertedAt: r.last_alerted_at,
      updatedAt: r.updated_at,
    };
  }

  async update(variantId: string, dto: UpdateInventoryDto) {
    const existing = this.get(variantId);
    const changes: Array<{ action: string; before: number; after: number }> = [];

    if (dto.stockQty !== undefined && dto.stockQty !== existing.stockQty) {
      this.db
        .prepare(`UPDATE inventory SET stock_qty = ?, updated_at = ? WHERE variant_id = ?`)
        .run(dto.stockQty, new Date().toISOString(), variantId);
      changes.push({
        action: 'inventory.stock_changed',
        before: existing.stockQty,
        after: dto.stockQty,
      });
    }
    if (dto.threshold !== undefined && dto.threshold !== existing.threshold) {
      this.db
        .prepare(`UPDATE inventory SET threshold = ?, updated_at = ? WHERE variant_id = ?`)
        .run(dto.threshold, new Date().toISOString(), variantId);
      changes.push({
        action: 'inventory.threshold_changed',
        before: existing.threshold,
        after: dto.threshold,
      });
    }

    for (const c of changes) {
      this.audit.record({
        merchantId: null, // resolved via variant if needed; left null for compactness
        actor: 'user',
        action: c.action as any,
        targetType: 'variant',
        targetId: variantId,
        payload: { before: c.before, after: c.after },
      });
    }

    // Refresh and trigger alert check.
    const updated = this.get(variantId);
    const alert = await this.alerts.checkVariant(variantId);
    return { ...updated, alertSent: alert ? { id: alert.id, sentAt: alert.sentAt } : null };
  }

  async adjust(variantId: string, dto: AdjustInventoryDto) {
    const existing = this.get(variantId);
    const next = Math.max(0, existing.stockQty + dto.delta);
    return this.update(variantId, { stockQty: next });
  }
}
