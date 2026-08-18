import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { seedAll } from './seed';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);
  constructor(private readonly db: DatabaseService) {}

  /** Re-seeds only if the DB has no merchants. Idempotent and safe on boot. */
  seedIfEmpty(): void {
    const count = (this.db.prepare(`SELECT COUNT(*) as c FROM merchants`).get() as { c: number }).c;
    if (count > 0) {
      this.logger.debug(`Skipping seed — ${count} merchants already exist.`);
      return;
    }
    this.seed(true);
  }

  /** Always re-seeds (used by `npm run seed`). */
  seed(verbose = true): void {
    const result = seedAll(this.db);
    if (verbose) {
      this.logger.log(
        `Seeded ${result.merchants} merchants, ${result.products} products, ${result.variants} variants.`,
      );
    }
  }
}
