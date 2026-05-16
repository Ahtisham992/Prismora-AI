// src/modules/report/report.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
