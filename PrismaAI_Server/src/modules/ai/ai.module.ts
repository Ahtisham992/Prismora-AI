// src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60 sec
      maxRedirects: 5,
    }),
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
