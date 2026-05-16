// src/modules/bookmark/bookmark.controller.ts

import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BookmarkService } from './bookmark.service';

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  // -------------------------------------------------------
  // ⭐ ADD BOOKMARK
  // -------------------------------------------------------
  @Post(':postId')
  addBookmark(@Req() req: any, @Param('postId') postId: string) {
    return this.bookmarkService.addBookmark(req.user.userId, Number(postId));
  }

  // -------------------------------------------------------
  // ❌ REMOVE BOOKMARK
  // -------------------------------------------------------
  @Delete(':postId')
  removeBookmark(@Req() req: any, @Param('postId') postId: string) {
    return this.bookmarkService.removeBookmark(req.user.userId, Number(postId));
  }

  // -------------------------------------------------------
  // 📚 GET USER BOOKMARKS
  // -------------------------------------------------------
  @Get('me')
  getMyBookmarks(@Req() req: any) {
    return this.bookmarkService.getMyBookmarks(req.user.userId);
  }
}
