// src/modules/report/report.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ---------------------------------------------------
  // 🚨 Report a Post
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post(':postId')
  createReport(
    @Req() req: any,
    @Param('postId') postId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.create(req.user.userId, Number(postId), dto);
  }

  // ---------------------------------------------------
  // 👮 Admin: Get All Reports
  // ---------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllReports(@Req() req: any) {
    // Temporary admin check — replace with proper RoleGuard later
    if (req.user.userId !== 1) {
      throw new ForbiddenException('Admins only');
    }
    return this.reportService.getAllReports();
  }
}
