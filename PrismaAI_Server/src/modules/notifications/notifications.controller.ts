// src/modules/notification/notification.controller.ts

import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationService } from './notifications.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // -----------------------------------------------------------
  // 🔔 GET USER NOTIFICATIONS
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get()
  getMyNotifications(@Req() req: any) {
    return this.notificationService.getUserNotifications(req.user.userId);
  }

  // -----------------------------------------------------------
  // ✅ MARK AS READ (single)
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user.userId, Number(id));
  }

  // -----------------------------------------------------------
  // ✅ MARK ALL AS READ
  // -----------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Patch('read/all')
  markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }
}
