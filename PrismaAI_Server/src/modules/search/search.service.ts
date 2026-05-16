import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(keyword: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        OR: [
          {
            title: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            categories: {
              has: keyword,
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const people = await this.prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            bio: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        bio: true,
      },
      take: 10,
    });

    return {
      posts,
      people,
    };
  }
}
