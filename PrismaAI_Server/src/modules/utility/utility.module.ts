import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilityService } from './utility.service';
import { UtilityController } from './utility.controller';
@Module({
  controllers: [UtilityController],
  providers: [UtilityService, PrismaService],
})
export class UtilityModule {}
