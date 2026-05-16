// src/modules/notification/notification.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------
  // 🔔 CREATE NOTIFICATION (CORE METHOD)
  // -----------------------------------------------------------
  async createNotification({
    userId,
    actorId,
    type,
    postId,
    commentId,
  }: {
    userId: number;
    actorId: number;
    type: NotificationType;
    postId?: number;
    commentId?: number;
  }) {
    // ❗ prevent self-notifications
    if (userId === actorId) return null;

    return this.prisma.notification.create({
      data: {
        userId,
        actorId,
        type,
        postId,
        commentId,
      },
    });
  }

  // -----------------------------------------------------------
  // 📥 GET USER NOTIFICATIONS
  // -----------------------------------------------------------
  async getUserNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
        post: {
          select: {
            id: true,
            thumbnailUrl: true,
          },
        },
        comment: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });
  }

  // -----------------------------------------------------------
  // ✅ MARK SINGLE AS READ
  // -----------------------------------------------------------
  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // -----------------------------------------------------------
  // ✅ MARK ALL AS READ
  // -----------------------------------------------------------
  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { message: 'All notifications marked as read' };
  }

  // -----------------------------------------------------------
  // ❌ DELETE NOTIFICATION (optional)
  // -----------------------------------------------------------
  async deleteNotification(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted' };
  }
}
