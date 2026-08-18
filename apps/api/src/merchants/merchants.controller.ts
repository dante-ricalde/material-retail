import { Controller, Get, Param } from '@nestjs/common';
import { listMerchants, resolveMerchantBySlug } from '../common/merchants';
import { DatabaseService } from '../database/database.service';
import { AlertsService } from '../alerts/alerts.service';

@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly db: DatabaseService,
    private readonly alerts: AlertsService,
  ) {}

  @Get()
  list() {
    const rows = listMerchants();
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      category: m.category,
      ownerName: m.owner_name,
      alertEmail: m.alert_email,
      defaultThreshold: m.default_threshold,
    }));
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    const m = resolveMerchantBySlug(slug);

    const totals = this.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM products WHERE merchant_id = ?) AS products,
           (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.merchant_id = ?) AS variants,
           (SELECT COUNT(*) FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id WHERE p.merchant_id = ?) AS inventory_rows,
           (SELECT COUNT(*) FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id WHERE p.merchant_id = ? AND i.stock_qty <= i.threshold) AS low_stock`,
      )
      .get(m.id, m.id, m.id, m.id) as {
        products: number;
        variants: number;
        inventory_rows: number;
        low_stock: number;
      };

    const recent = this.alerts.recentForMerchant(m.id, 5);

    return {
      id: m.id,
      name: m.name,
      slug: m.slug,
      category: m.category,
      ownerName: m.owner_name,
      alertEmail: m.alert_email,
      defaultThreshold: m.default_threshold,
      summary: {
        ...totals,
        openAlerts: recent.filter((a) => !a.acknowledgedAt && !a.resolvedAt).length,
      },
      recentAlerts: recent,
    };
  }
}
