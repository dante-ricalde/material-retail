import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SeedService } from './seed.service';

@Global()
@Module({
  providers: [DatabaseService, SeedService],
  exports: [DatabaseService, SeedService],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);
  constructor(
    private readonly db: DatabaseService,
    private readonly seed: SeedService,
  ) {}

  async onModuleInit() {
    this.db.open();
    this.seed.seedIfEmpty();
    this.logger.log('Database ready.');
  }
}
