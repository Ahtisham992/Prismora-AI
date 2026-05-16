// src/modules/like/like.controller.ts

import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  // -----------------------------------------------------------
  // ❤️ LIKE
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post(':postId/like')
  like(@Req() req: any, @Param('postId') postId: string) {
    return this.likeService.likePost(req.user.userId, Number(postId));
  }

  // -----------------------------------------------------------
  // 💔 DISLIKE
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post(':postId/dislike')
  dislike(@Req() req: any, @Param('postId') postId: string) {
    return this.likeService.dislikePost(req.user.userId, Number(postId));
  }

  // -----------------------------------------------------------
  // ❌ REMOVE LIKE / DISLIKE
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Delete(':postId')
  remove(@Req() req: any, @Param('postId') postId: string) {
    return this.likeService.removeReaction(req.user.userId, Number(postId));
  }
}
