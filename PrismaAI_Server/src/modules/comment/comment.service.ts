import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ---------------------------------------------------
  // 📌 Get all comments for a post
  // ---------------------------------------------------
  async getCommentsForPost(postId: number) {
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
        likedBy: true,
      },
    });
  }

  // ---------------------------------------------------
  // ✏️ Create a comment
  // ---------------------------------------------------
  async createComment(
    userId: number,
    postId: number,
    dto: CreateCommentDto,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: {
        text: dto.text,
        userId,
        postId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
    });

    // increment comment count
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    // 🔔 NOTIFICATION → post owner
    await this.notificationService.createNotification({
      userId: post.creatorId,
      actorId: userId,
      type: NotificationType.COMMENT,
      postId,
      commentId: comment.id,
    });

    return comment;
  }

  // ---------------------------------------------------
  // 🗑 Delete comment
  // ---------------------------------------------------
  async deleteComment(userId: number, commentId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.userId !== userId) {
      throw new ForbiddenException('Not allowed to delete this comment');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });

    return { message: 'Comment deleted' };
  }

  // ---------------------------------------------------
  // ❤️ Like comment
  // ---------------------------------------------------
  async likeComment(userId: number, commentId: number) {
    const comment = await this.ensureCommentExists(commentId);

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) return { liked: true };

    await this.prisma.commentLike.create({
      data: { userId, commentId },
    });

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { likes: { increment: 1 } },
    });

    // 🔔 NOTIFICATION → comment owner
    await this.notificationService.createNotification({
      userId: comment.userId,
      actorId: userId,
      type: NotificationType.COMMENT_LIKE,
      postId: comment.postId,
      commentId,
    });

    return { liked: true };
  }

  // ---------------------------------------------------
  // 💔 Unlike comment
  // ---------------------------------------------------
  async unlikeComment(userId: number, commentId: number) {
    const comment = await this.ensureCommentExists(commentId);

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (!existing) return { liked: false };

    await this.prisma.commentLike.delete({
      where: { userId_commentId: { userId, commentId } },
    });

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { likes: { decrement: 1 } },
    });

    return { liked: false };
  }

  // ---------------------------------------------------
  // 🧠 Utility
  // ---------------------------------------------------
  private async ensureCommentExists(commentId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    return comment;
  }
}