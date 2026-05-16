// src/modules/notification/notification.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService], // important (used by like/comment/follow modules)
})
export class NotificationModule {}