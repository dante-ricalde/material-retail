import { Module } from '@nestjs/common';
import { LowStockSweepTask } from './low-stock-sweep.task';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  providers: [LowStockSweepTask],
})
export class SchedulerModule {}
