import { Injectable, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'node:path';
import * as fs from 'node:fs';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  alert_email TEXT NOT NULL,
  default_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  description TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(merchant_id, name);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attributes_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 5,
  below_threshold_since TEXT,
  last_alerted_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(stock_qty, threshold);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  stock_qty INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  sent_at TEXT NOT NULL,
  channel TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  acknowledged_at TEXT,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_merchant ON alerts(merchant_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_alerts_variant ON alerts(variant_id, sent_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  merchant_id TEXT REFERENCES merchants(id) ON DELETE CASCADE,
  actor TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_merchant ON audit_log(merchant_id, created_at);
`;

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private conn!: Database.Database;

  /** Resolves to <repo>/data/app.db in dev, or $DATABASE_DIR/app.db in prod. */
  dbPath(): string {
    // Honor DATABASE_DIR env override (set in prod Dockerfile / fly.toml).
    if (process.env.DATABASE_DIR) {
      return path.join(process.env.DATABASE_DIR, 'app.db');
    }
    // apps/api/src/database → apps/api → apps → repoRoot → data/app.db
    const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
    return path.join(repoRoot, 'data', 'app.db');
  }

  open(): Database.Database {
    if (this.conn) return this.conn;
    const dbPath = this.dbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.conn = new Database(dbPath);
    this.conn.pragma('journal_mode = WAL');
    this.conn.pragma('foreign_keys = ON');
    this.conn.exec(SCHEMA);
    this.logger.log(`SQLite opened at ${dbPath}`);
    return this.conn;
  }

  get conn_(): Database.Database {
    return this.conn ?? this.open();
  }

  exec(sql: string): void {
    this.conn_.exec(sql);
  }

  prepare(sql: string): Database.Statement {
    return this.conn_.prepare(sql);
  }

  /** Run `fn` in a synchronous transaction. better-sqlite3 is sync — no Promises needed. */
  tx<T>(fn: () => T): T {
    return this.conn_.transaction(fn)();
  }
}
