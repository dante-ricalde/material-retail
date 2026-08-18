import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { resolveMerchantIdBySlug } from '../common/merchants';

@Controller('merchants/:slug/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Param('slug') slug: string, @Query('limit') limit?: string) {
    const merchantId = resolveMerchantIdBySlug(slug);
    return this.audit.list(merchantId, limit ? Math.min(500, Math.max(1, Number(limit))) : 100);
  }
}
