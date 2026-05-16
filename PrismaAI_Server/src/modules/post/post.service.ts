// src/modules/post/post.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(cursor?: number, limit: number = 10) {
    const posts = await this.prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
        summary: true, // ✅ include PostSummary
      },
    });

    let nextCursor: number | null = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      if (nextItem) {
        nextCursor = nextItem.id;
      }
    }

    return {
      data: posts,
      nextCursor,
    };
  }

  async getPostById(id: number) {
    if (!id || isNaN(id))
      throw new BadRequestException('Invalid post ID aklsnlkdsa');

    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, profilePhoto: true } },
        summary: true, // ✅ include PostSummary
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async createPost(userId: number, dto: CreatePostDto) {
    const { summary, ...postData } = dto;
    await this.prisma.post.create({
      data: {
        ...postData,
        creatorId: userId,
        ...(summary && {
          summary: {
            create: summary, // ✅ Creates a linked PostSummary record
          },
        }),
      },
    });
  }

  async deletePost(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) throw new NotFoundException('Post not found');
    if (post.creatorId !== userId)
      throw new ForbiddenException('You cannot delete this post');

    // Delete all child records first (FK constraints are RESTRICT, not CASCADE)
    await this.prisma.$transaction([
      this.prisma.postSummary.deleteMany({ where: { postId } }),
      this.prisma.commentLike.deleteMany({ where: { comment: { postId } } }),
      this.prisma.comment.deleteMany({ where: { postId } }),
      this.prisma.postLike.deleteMany({ where: { postId } }),
      this.prisma.bookmark.deleteMany({ where: { postId } }),
      this.prisma.report.deleteMany({ where: { postId } }),
      this.prisma.post.delete({ where: { id: postId } }),
    ]);


    return { message: 'Post deleted successfully' };
  }


  async incrementViews(id: number) {
    await this.prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  async incrementShares(id: number) {
    await this.prisma.post.update({
      where: { id },
      data: { shares: { increment: 1 } },
    });
  }

  async getPostsByUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const posts = await this.prisma.post.findMany({
      where: { creatorId: userId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
        summary: true, // ✅ include PostSummary
      },
      orderBy: { createdAt: 'desc' },
    });

    return posts;
  }

  async getPostsByCategories(categories: string[], limit = 10) {
    return this.prisma.post.findMany({
      where: { categories: { hasSome: categories } },
      include: {
        creator: { select: { id: true, username: true, profilePhoto: true } },
        summary: true, // ✅ include PostSummary
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTrendingPosts(limit = 10) {
    return this.prisma.post.findMany({
      take: limit,
      include: {
        creator: { select: { id: true, username: true, profilePhoto: true } },
        summary: true, // ✅ include PostSummary
      },
      orderBy: [
        { views: 'desc' },
        { likes: 'desc' },
        { shares: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }
}
