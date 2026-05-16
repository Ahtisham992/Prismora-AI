// src/modules/comment/comment.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { NotificationModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
