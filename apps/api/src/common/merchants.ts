import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

let _db: DatabaseService | null = null;

/** Late-bind the global DatabaseService. Set once at app start. */
export function bindDatabase(db: DatabaseService): void {
  _db = db;
}

export function getDb(): DatabaseService {
  if (!_db) throw new Error('Database not bound. Did the API finish bootstrapping?');
  return _db;
}

export interface MerchantRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  owner_name: string;
  alert_email: string;
  default_threshold: number;
  created_at: string;
}

export function listMerchants(): MerchantRow[] {
  return getDb()
    .prepare(`SELECT * FROM merchants ORDER BY name`)
    .all() as MerchantRow[];
}

export function findMerchantBySlug(slug: string): MerchantRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM merchants WHERE slug = ?`)
    .get(slug) as MerchantRow | undefined;
}

export function resolveMerchantBySlug(slug: string): MerchantRow {
  const m = findMerchantBySlug(slug);
  if (!m) throw new NotFoundException(`Merchant not found: ${slug}`);
  return m;
}

export function resolveMerchantIdBySlug(slug: string): string {
  return resolveMerchantBySlug(slug).id;
}
