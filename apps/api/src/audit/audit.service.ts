import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { nanoid } from 'nanoid';

export type AuditAction =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'variant.created'
  | 'variant.updated'
  | 'variant.deleted'
  | 'inventory.stock_changed'
  | 'inventory.threshold_changed'
  | 'inventory.adjusted'
  | 'alert.sent'
  | 'alert.acknowledged';

export interface AuditEntry {
  id: string;
  merchantId: string | null;
  actor: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  record(entry: Omit<AuditEntry, 'id'>): void {
    this.db.prepare(
      `INSERT INTO audit_log (id, merchant_id, actor, action, target_type, target_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      nanoid(),
      entry.merchantId,
      entry.actor ?? 'system',
      entry.action,
      entry.targetType,
      entry.targetId,
      JSON.stringify(entry.payload ?? {}),
      new Date().toISOString(),
    );
  }

  list(merchantId: string, limit = 100): Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    payload: Record<string, unknown>;
    actor: string;
    createdAt: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, action, target_type, target_id, payload_json, actor, created_at
         FROM audit_log
         WHERE merchant_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(merchantId, limit) as Array<{
        id: string;
        action: string;
        target_type: string;
        target_id: string;
        payload_json: string;
        actor: string;
        created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      actor: r.actor,
      payload: JSON.parse(r.payload_json || '{}'),
      createdAt: r.created_at,
    }));
  }
}
