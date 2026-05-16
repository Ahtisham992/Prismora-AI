// src/modules/bookmark/bookmark.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BookmarkController],
  providers: [BookmarkService],
})
export class BookmarkModule {}
