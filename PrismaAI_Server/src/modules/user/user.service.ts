// src/modules/user/user.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------
  // Get full profile
  // ---------------------------------------------------------
  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ---------------------------------------------------------
  // Get public profile
  // ---------------------------------------------------------
  async getPublicProfile(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        profilePhoto: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ---------------------------------------------------------
  // Update user
  // ---------------------------------------------------------
  async updateUser(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  // ---------------------------------------------------------
  // Update username
  // ---------------------------------------------------------
  async updateUsername(id: number, username: string) {
    const exists = await this.prisma.user.findUnique({
      where: { username },
    });

    if (exists) throw new BadRequestException('Username already taken');

    return this.prisma.user.update({
      where: { id },
      data: { username },
    });
  }

  // ---------------------------------------------------------
  // Update profile photo
  // ---------------------------------------------------------
  async updatePhoto(id: number, photoUrl: string) {
    return this.prisma.user.update({
      where: { id },
      data: { profilePhoto: photoUrl },
    });
  }

  // =========================================================
  // FOLLOW SYSTEM
  // =========================================================

  async followUser(followerId: number, followingId: number) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const exists = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (exists) throw new BadRequestException('Already following');

    return this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowUser(followerId: number, followingId: number) {
    return this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  async getFollowers(userId: number) {
    return this.prisma.follow.findMany({
      where: {
        followingId: userId,
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
    });
  }

  async getFollowing(userId: number) {
    return this.prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
    });
  }

  // =========================================================
  // USER STATS
  // =========================================================

  async getUserStats(userId: number) {
    const [posts, followers, following] = await Promise.all([
      this.prisma.post.count({
        where: { creatorId: userId },
      }),

      this.prisma.follow.count({
        where: { followingId: userId },
      }),

      this.prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      posts,
      followers,
      following,
    };
  }

  // Suggested Content Creators
  async getSuggestedCreators(userId: number, limit = 10) {
    // 1️⃣ Get users the current user is already following
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // 2️⃣ Fetch users excluding self and already followed
    const suggested = await this.prisma.user.findMany({
      where: {
        id: {
          notIn: [userId, ...followingIds],
        },
      },
      orderBy: {
        posts: {
          _count: 'desc', // users with more posts first
        },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        bio: true,
      },
      take: limit,
    });

    return suggested;
  }

  async isFollowing(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) {
      return { isFollowing: false };
    }

    const follow = await this.prisma.follow.findFirst({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    return {
      isFollowing: !!follow,
    };
  }

  async getConnections(userId: number) {
    const [followers, following] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followingId: userId,
        },
        select: {
          follower: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              bio: true,
              followers: true,
            },
          },
        },
        take: 100,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.follow.findMany({
        where: {
          followerId: userId,
        },
        select: {
          following: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              bio: true,
              followers: true,
            },
          },
        },
        take: 100,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      followers: followers.map((f) => f.follower),
      following: following.map((f) => f.following),
    };
  }
}
