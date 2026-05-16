// src/modules/bookmark/bookmark.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------
  // ⭐ Add Bookmark
  // -------------------------------------------------------
  async addBookmark(userId: number, postId: number) {
    // ensure post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    try {
      await await this.prisma.bookmark.create({
        data: {
          userId,
          postId,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('Already bookmarked');
      }
      throw e;
    }

    return { message: 'Bookmark Added' };
  }

  // -------------------------------------------------------
  // ❌ Remove Bookmark
  // -------------------------------------------------------
  async removeBookmark(userId: number, postId: number) {
    await this.prisma.bookmark.delete({
      where: {
        userId_postId: { userId, postId },
      },
    });

    return { message: 'Bookmark removed' };
  }

  // -------------------------------------------------------
  // 📚 Get all bookmarks for logged-in user
  // -------------------------------------------------------
  async getMyBookmarks(userId: number) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    return bookmarks;
  }
}
