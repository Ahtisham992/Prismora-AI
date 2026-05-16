// src/modules/follow/follow.controller.ts

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
import { FollowService } from './follow.service';

@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // ---------------------------------------------------
  // ⭐ FOLLOW USER
  // ---------------------------------------------------
  @Post(':userId')
  followUser(@Req() req: any, @Param('userId') userId: string) {
    return this.followService.follow(req.user.userId, Number(userId));
  }

  // ---------------------------------------------------
  // ❌ UNFOLLOW USER
  // ---------------------------------------------------
  @Delete(':userId')
  unfollowUser(@Req() req: any, @Param('userId') userId: string) {
    return this.followService.unfollow(req.user.userId, Number(userId));
  }

  // ---------------------------------------------------
  // 👥 GET MY FOLLOWERS
  // ---------------------------------------------------
  @Get('me/followers')
  getMyFollowers(@Req() req: any) {
    return this.followService.getFollowers(req.user.userId);
  }

  // ---------------------------------------------------
  // 🫂 GET MY FOLLOWING
  // ---------------------------------------------------
  @Get('me/following')
  getMyFollowing(@Req() req: any) {
    return this.followService.getFollowing(req.user.userId);
  }
}
