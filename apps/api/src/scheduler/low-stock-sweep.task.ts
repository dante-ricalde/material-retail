import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class LowStockSweepTask {
  private readonly logger = new Logger(LowStockSweepTask.name);

  constructor(private readonly alerts: AlertsService) {}

  /**
   * Every minute, scan for inventory rows that have just crossed below their threshold
   * without an alert, and emit alerts. Belt-and-suspenders for any stock changes
   * made outside the API (e.g. direct DB edits).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweep() {
    try {
      const sent = await this.alerts.sweep();
      if (sent > 0) this.logger.log(`Sweep sent ${sent} alert(s).`);
    } catch (err) {
      this.logger.error(`Sweep failed: ${(err as Error).message}`);
    }
  }
}
