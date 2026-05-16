// src/modules/like/like.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class LikeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService, // ✅ added
  ) {}

  // -----------------------------------------------------------
  // ❤️ LIKE POST
  // -----------------------------------------------------------
  async likePost(userId: number, postId: number) {
    const post = await this.ensurePostExists(postId);

    const existing = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    // Already liked → no change (no duplicate notification)
    if (existing?.isLike === true) {
      return { liked: true, disliked: false };
    }

    // If previously disliked → switch to like
    if (existing?.isLike === false) {
      await this.prisma.postLike.update({
        where: { userId_postId: { userId, postId } },
        data: { isLike: true },
      });

      await this.adjustCounters(postId, +1, -1);
      console.log('Notification Start');

      // 🔔 optional: still notify (you can remove if unwanted spam)
      await this.notificationService.createNotification({
        userId: post.creatorId,
        actorId: userId,
        type: NotificationType.LIKE,
        postId,
      });
      console.log('Notification Start');

      return { liked: true, disliked: false, notification: true };
    }

    // Create new like
    await this.prisma.postLike.create({
      data: { userId, postId, isLike: true },
    });

    await this.adjustCounters(postId, +1, 0);

    // 🔔 CREATE NOTIFICATION
    await this.notificationService.createNotification({
      userId: post.creatorId,
      actorId: userId,
      type: NotificationType.LIKE,
      postId,
    });

    return { liked: true, disliked: false };
  }

  // -----------------------------------------------------------
  // 💔 DISLIKE POST
  // -----------------------------------------------------------
  async dislikePost(userId: number, postId: number) {
    const post = await this.ensurePostExists(postId);

    const existing = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    // Already disliked → no change
    if (existing?.isLike === false) {
      return { liked: false, disliked: true };
    }

    // If previously liked → switch to dislike
    if (existing?.isLike === true) {
      await this.prisma.postLike.update({
        where: { userId_postId: { userId, postId } },
        data: { isLike: false },
      });

      await this.adjustCounters(postId, -1, +1);

      return { liked: false, disliked: true };
    }

    // Create new dislike
    await this.prisma.postLike.create({
      data: { userId, postId, isLike: false },
    });

    await this.adjustCounters(postId, 0, +1);

    return { liked: false, disliked: true };
  }

  // -----------------------------------------------------------
  // ❌ REMOVE LIKE/DISLIKE
  // -----------------------------------------------------------
  async removeReaction(userId: number, postId: number) {
    await this.ensurePostExists(postId);

    const existing = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!existing) {
      return { message: 'No reaction exists' };
    }

    if (existing.isLike) {
      await this.adjustCounters(postId, -1, 0);
    } else {
      await this.adjustCounters(postId, 0, -1);
    }

    await this.prisma.postLike.delete({
      where: { userId_postId: { userId, postId } },
    });

    return { message: 'Reaction removed' };
  }

  // -----------------------------------------------------------
  // 📌 Utility Helpers
  // -----------------------------------------------------------

  private async ensurePostExists(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) throw new NotFoundException('Post not found');

    return post; // ✅ IMPORTANT (used for creatorId)
  }

  private async adjustCounters(
    postId: number,
    likeDelta: number,
    dislikeDelta: number,
  ) {
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        likes: { increment: likeDelta },
        dislikes: { increment: dislikeDelta },
      },
    });
  }
}
