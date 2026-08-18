/**
 * CLI entry point for `npm run seed`. Boots just the database + seed service,
 * runs seed, and exits.
 */
import 'reflect-metadata';
import { DatabaseService } from './database.service';
import { seedAll } from './seed';

function main(): void {
  const db = new DatabaseService();
  db.open();
  const result = seedAll(db);
  // eslint-disable-next-line no-console
  console.log(
    `✓ Seeded ${result.merchants} merchants, ${result.products} products, ${result.variants} variants.`,
  );
}

main();
