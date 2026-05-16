// src/modules/comment/comment.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // ---------------------------------------------------
  // 📌 GET COMMENTS FOR A POST
  // ---------------------------------------------------
  @Get(':postId')
  getComments(@Param('postId') postId: string) {
    return this.commentService.getCommentsForPost(Number(postId));
  }

  // ---------------------------------------------------
  // ✏️ CREATE COMMENT
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post(':postId')
  createComment(
    @Req() req: any,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.createComment(
      req.user.userId,
      Number(postId),
      dto,
    );
  }

  // ---------------------------------------------------
  // 🗑 DELETE COMMENT
  // Only comment owner can delete
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Delete('delete/:commentId')
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.commentService.deleteComment(
      req.user.userId,
      Number(commentId),
    );
  }

  // ---------------------------------------------------
  // ❤️ LIKE COMMENT
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post(':commentId/like')
  likeComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.commentService.likeComment(req.user.userId, Number(commentId));
  }

  // ---------------------------------------------------
  // 💔 UNLIKE COMMENT
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Delete(':commentId/like')
  unlikeComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.commentService.unlikeComment(
      req.user.userId,
      Number(commentId),
    );
  }
}
