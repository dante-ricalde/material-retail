import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { EmailService } from './email.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AlertsController],
  providers: [AlertsService, EmailService],
  exports: [AlertsService, EmailService],
})
export class AlertsModule {}
