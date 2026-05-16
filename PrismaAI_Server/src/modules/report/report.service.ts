// src/modules/report/report.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------
  // 🚨 REPORT A POST
  // ---------------------------------------------------
  async create(reporterId: number, postId: number, dto: CreateReportDto) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Prevent duplicate report by same user
    const existing = await this.prisma.report.findFirst({
      where: { reporterId, postId },
    });

    if (existing) {
      throw new BadRequestException('You already reported this post');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        postId,
        reason: dto.reason,
        additionalInfo: dto.additionalInfo || null,
      },
    });
  }

  // ---------------------------------------------------
  // 👮 ADMIN: GET ALL REPORTS
  // ---------------------------------------------------
  async getAllReports() {
    return this.prisma.report.findMany({
      include: {
        post: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        reporter: {
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
