import { Injectable, Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { DatabaseService } from '../database/database.service';
import { EmailService } from './email.service';
import { AuditService } from '../audit/audit.service';

export interface AlertRow {
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

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Checks one inventory row. Returns the alert row if one was sent, else null.
   * Debounced: only fires when stock has just dropped to/below threshold AND
   * we haven't already alerted for this same dropoff. Reset happens when stock
   * goes back above threshold.
   */
  async checkVariant(variantId: string): Promise<AlertRow | null> {
    const row = this.db
      .prepare(
        `SELECT i.id, i.variant_id, i.stock_qty, i.threshold, i.below_threshold_since, i.last_alerted_at, i.updated_at,
                v.name AS variant_name, v.attributes_json, v.product_id,
                p.name AS product_name, p.merchant_id,
                m.name AS merchant_name, m.alert_email
           FROM inventory i
           JOIN product_variants v ON v.id = i.variant_id
           JOIN products p ON p.id = v.product_id
           JOIN merchants m ON m.id = p.merchant_id
          WHERE i.variant_id = ?`,
      )
      .get(variantId) as
      | {
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
          merchant_id: string;
          merchant_name: string;
          alert_email: string;
        }
      | undefined;

    if (!row) return null;
    const now = new Date().toISOString();
    const isLow = row.stock_qty <= row.threshold;

    if (isLow) {
      // First time we saw it low? mark below_threshold_since.
      if (!row.below_threshold_since) {
        this.db
          .prepare(`UPDATE inventory SET below_threshold_since = ? WHERE id = ?`)
          .run(now, row.id);
      }
      // Already alerted for THIS low episode — debounce.
      if (row.last_alerted_at && row.below_threshold_since && row.last_alerted_at >= row.below_threshold_since) {
        return null;
      }
    } else {
      // Stock is above threshold. Reset both markers so the next dip can alert again.
      if (row.below_threshold_since || row.last_alerted_at) {
        this.db
          .prepare(
            `UPDATE inventory
              SET below_threshold_since = NULL,
                  last_alerted_at = NULL
            WHERE id = ?`,
          )
          .run(row.id);

        // Mark any open alerts for this variant as resolved.
        this.db
          .prepare(
            `UPDATE alerts SET resolved_at = COALESCE(resolved_at, ?)
              WHERE variant_id = ? AND resolved_at IS NULL`,
          )
          .run(now, variantId);
      }
      return null;
    }

    // Low + eligible to alert → send & record.
    const productLink = `${row.product_name}${
      row.variant_name ? ` — ${row.variant_name}` : ''
    }`;
    const attributes = (() => {
      try {
        return JSON.parse(row.attributes_json || '{}') as Record<string, string>;
      } catch {
        return {};
      }
    })();
    const summary =
      Object.entries(attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || 'No variant attributes';

    const payload = {
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      variantId: row.variant_id,
      productId: row.product_id,
      productName: row.product_name,
      variantName: row.variant_name,
      attributes,
      stockQty: row.stock_qty,
      threshold: row.threshold,
    };

    const alertId = nanoid();
    this.db
      .prepare(
        `INSERT INTO alerts (id, merchant_id, variant_id, stock_qty, threshold, sent_at, channel, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(alertId, row.merchant_id, row.variant_id, row.stock_qty, row.threshold, now, 'email', JSON.stringify(payload));

    this.db
      .prepare(`UPDATE inventory SET last_alerted_at = ? WHERE id = ?`)
      .run(now, row.id);

    this.audit.record({
      merchantId: row.merchant_id,
      actor: 'alerts-service',
      action: 'alert.sent',
      targetType: 'variant',
      targetId: row.variant_id,
      payload: { alertId, channel: 'email', stockQty: row.stock_qty, threshold: row.threshold },
    });

    // Send email (PreviewTransport → EML file).
    try {
      const eml = await this.email.sendLowStockAlert({
        to: row.alert_email,
        merchantName: row.merchant_name,
        productLink,
        summary,
        stockQty: row.stock_qty,
        threshold: row.threshold,
        alertId,
      });
      this.logger.debug(`Alert email written: ${eml}`);
    } catch (err) {
      // Don't lose the alert row even if email delivery hiccups.
      this.logger.error(`Email send failed for alert ${alertId}: ${(err as Error).message}`);
    }

    return {
      id: alertId,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      variantId: row.variant_id,
      productId: row.product_id,
      productName: row.product_name,
      variantName: row.variant_name,
      attributes,
      stockQty: row.stock_qty,
      threshold: row.threshold,
      sentAt: now,
      channel: 'email',
      acknowledgedAt: null,
      resolvedAt: null,
      payload,
    };
  }

  /** Sweep: check every inventory row for newly-low items. */
  async sweep(): Promise<number> {
    const rows = this.db
      .prepare(
        `SELECT variant_id FROM inventory
          WHERE stock_qty <= threshold
            AND (last_alerted_at IS NULL OR last_alerted_at < COALESCE(below_threshold_since, ''))`,
      )
      .all() as Array<{ variant_id: string }>;

    let sent = 0;
    for (const r of rows) {
      const a = await this.checkVariant(r.variant_id);
      if (a) sent++;
    }
    return sent;
  }

  recentForMerchant(merchantId: string, limit = 20): AlertRow[] {
    return this.db
      .prepare(
        `SELECT a.id, a.merchant_id, a.variant_id, a.stock_qty, a.threshold, a.sent_at, a.channel,
                a.acknowledged_at, a.resolved_at, a.payload_json,
                m.name AS merchant_name,
                v.name AS variant_name, v.attributes_json, v.product_id,
                p.name AS product_name
           FROM alerts a
           JOIN merchants m ON m.id = a.merchant_id
           JOIN product_variants v ON v.id = a.variant_id
           JOIN products p ON p.id = v.product_id
          WHERE a.merchant_id = ?
          ORDER BY a.sent_at DESC
          LIMIT ?`,
      )
      .all(merchantId, limit)
      .map((r) => this.hydrate(r as Record<string, unknown>));
  }

  listForMerchant(merchantId: string, opts: { onlyOpen?: boolean; since?: string } = {}): AlertRow[] {
    const where: string[] = ['a.merchant_id = ?'];
    const params: unknown[] = [merchantId];
    if (opts.onlyOpen) {
      where.push('a.resolved_at IS NULL');
    }
    if (opts.since) {
      where.push('a.sent_at >= ?');
      params.push(opts.since);
    }
    return this.db
      .prepare(
        `SELECT a.id, a.merchant_id, a.variant_id, a.stock_qty, a.threshold, a.sent_at, a.channel,
                a.acknowledged_at, a.resolved_at, a.payload_json,
                m.name AS merchant_name,
                v.name AS variant_name, v.attributes_json, v.product_id,
                p.name AS product_name
           FROM alerts a
           JOIN merchants m ON m.id = a.merchant_id
           JOIN product_variants v ON v.id = a.variant_id
           JOIN products p ON p.id = v.product_id
          WHERE ${where.join(' AND ')}
          ORDER BY a.sent_at DESC
          LIMIT 200`,
      )
      .all(...params)
      .map((r) => this.hydrate(r as Record<string, unknown>));
  }

  hydrate(r: Record<string, unknown>): AlertRow {
    let attributes: Record<string, string> = {};
    try {
      attributes = JSON.parse((r.attributes_json as string) || '{}');
    } catch {
      // ignore
    }
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse((r.payload_json as string) || '{}');
    } catch {
      // ignore
    }
    return {
      id: r.id as string,
      merchantId: r.merchant_id as string,
      merchantName: (r.merchant_name as string | undefined) ?? undefined,
      variantId: r.variant_id as string,
      productId: (r.product_id as string | undefined) ?? undefined,
      productName: (r.product_name as string | undefined) ?? undefined,
      variantName: (r.variant_name as string | undefined) ?? undefined,
      attributes,
      stockQty: r.stock_qty as number,
      threshold: r.threshold as number,
      sentAt: r.sent_at as string,
      channel: r.channel as string,
      acknowledgedAt: (r.acknowledged_at as string | null) ?? null,
      resolvedAt: (r.resolved_at as string | null) ?? null,
      payload,
    };
  }

  /** Currently-low items for the in-app drawer (single source of truth for badge count). */
  currentLowStockForMerchant(merchantId: string): AlertRow[] {
    return this.db
      .prepare(
        `SELECT a.id, a.merchant_id, a.variant_id, a.stock_qty, a.threshold, a.sent_at, a.channel,
                a.acknowledged_at, a.resolved_at, a.payload_json,
                m.name AS merchant_name,
                v.name AS variant_name, v.attributes_json, v.product_id,
                p.name AS product_name
           FROM alerts a
           JOIN merchants m ON m.id = a.merchant_id
           JOIN product_variants v ON v.id = a.variant_id
           JOIN products p ON p.id = v.product_id
          WHERE a.merchant_id = ?
            AND a.resolved_at IS NULL
          ORDER BY a.sent_at DESC`,
      )
      .all(merchantId)
      .map((r) => this.hydrate(r as Record<string, unknown>));
  }

  acknowledge(alertId: string): AlertRow | null {
    const now = new Date().toISOString();
    const info = this.db
      .prepare(
        `UPDATE alerts SET acknowledged_at = COALESCE(acknowledged_at, ?)
          WHERE id = ?`,
      )
      .run(now, alertId);
    if (info.changes === 0) return null;
    this.audit.record({
      merchantId: null,
      actor: 'user',
      action: 'alert.acknowledged',
      targetType: 'alert',
      targetId: alertId,
      payload: { acknowledgedAt: now },
    });
    const row = this.db
      .prepare(
        `SELECT * FROM alerts WHERE id = ?`,
      )
      .get(alertId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.hydrate(row);
  }
}
