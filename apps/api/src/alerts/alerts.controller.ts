import { Body, Controller, Get, Param, ParseBoolPipe, Post, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { resolveMerchantIdBySlug } from '../common/merchants';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(
    @Query('merchant_slug') merchantSlug?: string,
    @Query('only_open') onlyOpen?: string,
    @Query('since') since?: string,
  ) {
    if (!merchantSlug) {
      return [];
    }
    return this.alerts.listForMerchant(resolveMerchantIdBySlug(merchantSlug), {
      onlyOpen: onlyOpen === 'true' || onlyOpen === '1',
      since,
    });
  }

  @Get('low-stock')
  lowStock(@Query('merchant_slug') merchantSlug?: string) {
    if (!merchantSlug) return [];
    return this.alerts.currentLowStockForMerchant(resolveMerchantIdBySlug(merchantSlug));
  }

  @Post(':id/ack')
  ack(@Param('id') id: string) {
    const result = this.alerts.acknowledge(id);
    return result ?? { ok: false, id };
  }
}
