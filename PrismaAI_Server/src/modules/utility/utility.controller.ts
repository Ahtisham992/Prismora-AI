// utility.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UtilityService } from './utility.service';

@Controller('utility')
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) {}

  @Post('upload-video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    console.log('📦 FILE RECEIVED:', file?.path);

    const url = await this.utilityService.uploadToCloudinary(file);

    return {
      success: true,
      url,
    };
  }
}