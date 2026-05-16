// src/modules/follow/follow.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { NotificationModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [FollowController],
  providers: [FollowService],
})
export class FollowModule {}
