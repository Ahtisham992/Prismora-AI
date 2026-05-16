// src/modules/like/like.module.ts

import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeController } from './like.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [LikeController],
  providers: [LikeService],
})
export class LikeModule {}
