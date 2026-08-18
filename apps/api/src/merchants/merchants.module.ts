import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [MerchantsController],
})
export class MerchantsModule {}
