// src/modules/summary/summary.service.ts

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------
  // 📌 PUBLIC: Fetch or auto-generate Summary
  // ---------------------------------------------------
  async getSummary(postId: number) {
    // Ensure post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Check cached summary
    const existing = await this.prisma.postSummary.findUnique({
      where: { postId },
    });

    if (existing) return existing;

    // Auto-generate and save
    return this.generateSummary(postId);
  }

  // ---------------------------------------------------
  // 🤖 AI SUMMARY GENERATOR (Mock)
  // Replace with OpenAI/Gemini API later
  // ---------------------------------------------------
  private async generateAIContent(post: any) {
    // TODO: plug in OpenAI or Gemini model
    return {
      keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
      fullText: `Full summary for post: ${post.title}`,
      topics: ['AI', 'Tech', 'Science'],
      duration: '3 min read',
    };
  }

  // ---------------------------------------------------
  // 🛠 Shared generator for GET/POST
  // ---------------------------------------------------
  async generateSummary(postId: number, force = false) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    if (!force) {
      // Check if already cached
      const cached = await this.prisma.postSummary.findUnique({
        where: { postId },
      });
      if (cached) return cached;
    }

    // Generate summary via AI engine
    const ai = await this.generateAIContent(post);

    try {
      await this.prisma.postSummary.upsert({
        where: { postId },
        update: {
          keyPoints: JSON.stringify(ai.keyPoints),
          fullText: ai.fullText,
          topics: JSON.stringify(ai.topics),
          duration: ai.duration,
        },
        create: {
          postId,
          keyPoints: JSON.stringify(ai.keyPoints),
          fullText: ai.fullText,
          topics: JSON.stringify(ai.topics),
          duration: ai.duration,
        },
      });
    } catch (error) {
      console.log('SUMMARY SAVE ERROR:', error);
      throw new InternalServerErrorException('Could not generate summary');
    }
  }
}
