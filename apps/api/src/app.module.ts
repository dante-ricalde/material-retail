import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ProductsModule } from './products/products.module';
import { VariantsModule } from './variants/variants.module';
import { InventoryModule } from './inventory/inventory.module';
import { AlertsModule } from './alerts/alerts.module';
import { AuditModule } from './audit/audit.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    MerchantsModule,
    ProductsModule,
    VariantsModule,
    InventoryModule,
    AlertsModule,
    AuditModule,
    SchedulerModule,
    HealthModule,
  ],
})
export class AppModule {}
