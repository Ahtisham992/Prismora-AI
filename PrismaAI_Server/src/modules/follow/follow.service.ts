import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ---------------------------------------------------
  // ⭐ FOLLOW
  // ---------------------------------------------------
  async follow(followerId: number, targetUserId: number) {
    if (followerId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Ensure target user exists
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) throw new NotFoundException('User not found');

    try {
      const follow = await this.prisma.follow.create({
        data: {
          followerId,
          followingId: targetUserId,
        },
      });

      // 🔔 CREATE NOTIFICATION
      await this.notificationService.createNotification({
        userId: targetUserId,     // receiver
        actorId: followerId,      // who followed
        type: NotificationType.FOLLOW,
      });

      return follow;
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('Already following');
      }
      throw e;
    }
  }

  // ---------------------------------------------------
  // ❌ UNFOLLOW
  // ---------------------------------------------------
  async unfollow(followerId: number, targetUserId: number) {
    const follow = await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    return follow;
  }

  // ---------------------------------------------------
  // 👥 GET FOLLOWERS
  // ---------------------------------------------------
  async getFollowers(userId: number) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------
  // 🫂 GET FOLLOWING
  // ---------------------------------------------------
  async getFollowing(userId: number) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}