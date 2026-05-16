// src/modules/user/user.controller.ts

import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Param,
  Post,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ----------------------------
  // Get authenticated user profile
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.userService.getUserById(req.user.userId);
  }

  // ----------------------------
  // Update full profile
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  updateProfile(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(req.user.userId, dto);
  }

  // ----------------------------
  // Update username
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Patch('username')
  updateUsername(@Req() req: any, @Body() dto: UpdateUsernameDto) {
    return this.userService.updateUsername(req.user.userId, dto.username);
  }

  // ----------------------------
  // Update profile photo
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Patch('photo')
  updatePhoto(@Req() req: any, @Body() dto: UpdatePhotoDto) {
    return this.userService.updatePhoto(req.user.userId, dto.profilePhoto);
  }

  // ----------------------------
  // User stats (authenticated)
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getUserStats(@Req() req: any) {
    return this.userService.getUserStats(req.user.userId);
  }

  // Suggested content creators
  @UseGuards(JwtAuthGuard)
  @Get('suggested')
  getSuggestedCreators(@Req() req: any) {
    const limit = 10; // fixed limit
    return this.userService.getSuggestedCreators(req.user.userId, limit);
  }

  // ----------------------------
  // My followers + following
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Get('connections')
  getMyConnections(@Req() req: any) {
    return this.userService.getConnections(req.user.userId);
  }

  // ----------------------------
  // Check if current user follows another user
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Get('is-following/:id')
  isFollowing(@Req() req: any, @Param('id') id: string) {
    return this.userService.isFollowing(req.user.userId, Number(id));
  }
  // ----------------------------
  // User stats by userId
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Get('stats/:id')
  getUserStatsById(@Param('id') id: string) {
    return this.userService.getUserStats(Number(id));
  }

  // ----------------------------
  // Follow system
  // ----------------------------
  @UseGuards(JwtAuthGuard)
  @Post('follow/:id')
  followUser(@Req() req: any, @Param('id') id: string) {
    return this.userService.followUser(req.user.userId, Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('follow/:id')
  unfollowUser(@Req() req: any, @Param('id') id: string) {
    return this.userService.unfollowUser(req.user.userId, Number(id));
  }

  // ----------------------------
  // Get followers/following (public)
  // ----------------------------
  @Get(':id/followers')
  getFollowers(@Param('id') id: string) {
    return this.userService.getFollowers(Number(id));
  }

  @Get(':id/following')
  getFollowing(@Param('id') id: string) {
    return this.userService.getFollowing(Number(id));
  }

  // ----------------------------
  // Get public user profile (dynamic route last!)
  // ----------------------------
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.userService.getPublicProfile(Number(id));
  }

  // ----------------------------
  // Someone else's followers + following
  // ----------------------------
  @Get(':id/connections')
  getConnectionsById(@Param('id') id: string) {
    return this.userService.getConnections(Number(id));
  }
}
