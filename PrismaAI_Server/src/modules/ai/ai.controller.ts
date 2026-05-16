// src/modules/ai/ai.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  async health(): Promise<{ status: string; message: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.aiService.health();
  }

  @Post('extract-info')
  async extract(@Body() body: any): Promise<any> {
    return await this.aiService.extract_info(body);
  }

  @Post('validate-podcast')
  async validatePodcast(@Body() body: any): Promise<any> {
    return await this.aiService.validate_podcast(body);
  }
  //   REQUEST:  { "youtube_url": "string" }
  //   RESPONSE: { "is_valid": bool, "reason": string, "confidence": float, "duration_seconds": int | null }

  //   REQUEST
  //   {
  //   "youtube_url": "https://example.com/"
  // }
  // RESPONSE
  //   {
  //   "thumbnailSrc": "string",
  //   "title": "string",
  //   "description": "string",
  //   "tags": [
  //     "string"
  //   ]
  // }

  @Post('transcribe')
  async transcribe(@Body() body: any): Promise<any> {
    return await this.aiService.transcribe(body);
  }
  //   REQUEST
  //   {
  //   "youtube_url": "https://example.com/",
  //   "include_timestamps": true
  // }
  // RESPONSE
  // {
  //   "text": "string",
  //   "duration_seconds": 0,
  //   "segments": [
  //     {
  //       "start": 0,
  //       "end": 0,
  //       "text": "string"
  //     }
  //   ]
  // }
  @Post('summarize')
  async summarize(@Body() body: any): Promise<any> {
    return await this.aiService.summarize(body);
  }
  //   REQUEST
  //   {
  //   "text": "string",
  //   "segments": [
  //     {
  //       "start": 0,
  //       "end": 0,
  //       "text": "string"
  //     }
  //   ],
  //   "duration_seconds": 0
  // }

  // RESPONSE
  //   {
  //   "keyPoints": "string",
  //   "fullText": "string",
  //   "topics": "string",
  //   "duration": "string"
  // }

  @Post('highlight-generate')
  async highlight(@Body() body: any): Promise<any> {
    return await this.aiService.generateHighlight(body);
  }
  //   REQUEST
  //   {
  //   "youtube_url": "https://example.com/",
  //   "segments": [
  //     {
  //       "start": 0,
  //       "end": 0,
  //       "text": "string"
  //     }
  //   ],
  //   "duration": "string",
  //   "suggestion": "string"
  // }
  //   RESPONSE
  //     {
  //   "highlight_video_url": "string",
  //   "total_duration": 0
  // }

  @Post('fuse-clips')
  async fuse(@Body() body: any): Promise<any> {
    return await this.aiService.fuseClips(body);
  }
}
