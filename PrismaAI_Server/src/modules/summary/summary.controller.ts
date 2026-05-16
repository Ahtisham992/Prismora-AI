// src/modules/summary/summary.controller.ts

import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SummaryService } from './summary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  // ---------------------------------------------------
  // 📌 Fetch Summary (DB or auto-generate)
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get(':postId')
  async getSummary(@Param('postId') postId: string) {
    return this.summaryService.getSummary(Number(postId));
  }

  // ---------------------------------------------------
  // 👮 Admin: Force-generate summary
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post(':postId')
  async forceGenerate(@Req() req: any, @Param('postId') postId: string) {
    // Temporary admin check (replace with RoleGuard later)
    if (req.user.userId !== 1) {
      throw new ForbiddenException('Admins only');
    }

    return this.summaryService.generateSummary(Number(postId), true);
  }
}
