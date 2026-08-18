// Smoke test: boots Nest app context, exercises key flows, exits non-zero on failure.
// Run with `npm run smoke` from the project root.
const path = require('path');

// Register ts-node before requiring any TS source.
require('ts-node').register({
  transpileOnly: true,
  project: path.join(__dirname, '..', 'tsconfig.json'),
});

require('reflect-metadata');

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../src/app.module');
const { DatabaseService } = require('../src/database/database.service');
const { SeedService } = require('../src/database/seed.service');
const { bindDatabase, findMerchantBySlug } = require('../src/common/merchants');
const { ProductsService } = require('../src/products/products.service');
const { InventoryService } = require('../src/inventory/inventory.service');
const { AlertsService } = require('../src/alerts/alerts.service');

function assert(cond, msg) {
  if (!cond) {
    console.error('✗ Smoke FAIL:', msg);
    process.exit(2);
  }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  bindDatabase(app.get(DatabaseService));
  const seed = app.get(SeedService);
  const products = app.get(ProductsService);
  const inventory = app.get(InventoryService);
  const alerts = app.get(AlertsService);

  // Always re-seed for a deterministic smoke test.
  seed.seed(false);

  // 1. Merchant exists.
  const m = findMerchantBySlug('aquarius');
  assert(m, 'Expected aquarius merchant to exist');
  assert(m.name === 'Aquarius Cosmetics', 'Aquarius name mismatch');
  console.log('✓ Merchants seeded correctly');

  // 2. Product list returns.
  const list = products.list('aquarius', { pageSize: 5 });
  assert(list.items.length > 0, 'Aquarius products should not be empty');
  console.log(`✓ Product list returned ${list.items.length} items (total ${list.total})`);

  // 3. Brooklyn Tripod Lamp exists and starts low.
  const brooklyn = products
    .list('mountain-house', { search: 'Brooklyn' })
    .items.find((p) => p.name.includes('Brooklyn'));
  assert(brooklyn, 'Brooklyn Tripod Lamp must exist in seed');
  console.log('✓ Brooklyn Tripod Lamp exists');

  const brooklynDetail = products.detail(brooklyn.id);
  assert(brooklynDetail.variants.length === 1, 'Brooklyn should have 1 variant');
  const brooklynVariant = brooklynDetail.variants[0];
  assert(
    brooklynVariant.stockQty <= brooklynVariant.threshold,
    'Brooklyn variant should be low-stock at seed time',
  );
  console.log('✓ Brooklyn variant is at/below threshold');

  // 4. Sweep runs cleanly.
  const sweepSent = await alerts.sweep();
  assert(typeof sweepSent === 'number', 'Sweep should return a number');
  console.log(`✓ Sweep ran cleanly (sent ${sweepSent})`);

  // 5. Inventory adjustment below threshold should produce an alert for a fresh variant.
  const freshVariant = products
    .list('aquarius', { pageSize: 25 })
    .items.map((p) => products.detail(p.id))
    .flatMap((p) => p.variants)
    .find((v) => v.stockQty > v.threshold && v.stockQty >= 2);
  assert(freshVariant, 'Need a non-low-stock Aquarius variant for the smoke test');

  await inventory.update(freshVariant.id, { stockQty: 0 });
  const updated = inventory.get(freshVariant.id);
  assert(updated.stockQty === 0, 'Stock should now be 0');
  console.log('✓ Inventory update reflected in DB');

  const afterAlerts = alerts.recentForMerchant(m.id, 100);
  const newAlert = afterAlerts.find(
    (a) => a.variantId === freshVariant.id && !a.resolvedAt,
  );
  assert(newAlert, 'A new unresolved alert should have been created');
  console.log(`✓ Alert created for variant ${freshVariant.id}`);

  // 6. Reverting stock above threshold should resolve the alert.
  await inventory.update(freshVariant.id, { stockQty: updated.threshold + 5 });
  const refreshed = inventory.get(freshVariant.id);
  assert(refreshed.stockQty === updated.threshold + 5, 'Stock should be restored');
  const resolved = alerts
    .recentForMerchant(m.id, 100)
    .find((a) => a.variantId === freshVariant.id);
  assert(resolved && resolved.resolvedAt, 'Alert should be marked resolved');
  console.log('✓ Alert auto-resolves when stock climbs back above threshold');

  await app.close();
  console.log('\n✓ Smoke test passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Smoke threw:', err);
  process.exit(2);
});
