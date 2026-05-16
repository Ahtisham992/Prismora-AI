// src/modules/post/dto/create-post.dto.ts

import {
  IsString,
  IsInt,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PostSummaryDto {
  @IsOptional()
  @IsString()
  keyPoints?: string;

  @IsOptional()
  @IsString()
  fullText?: string;

  @IsOptional()
  @IsString()
  topics?: string;

  @IsOptional()
  @IsString()
  duration?: string; // e.g., "3 min read"
}

export class CreatePostDto {
  @IsString()
  videoUrl: string;

  @IsString()
  thumbnailUrl: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  duration: number;

  @IsOptional()
  @IsString()
  podcastName?: string;

  @IsOptional()
  @IsString()
  episodeNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostSummaryDto)
  summary?: PostSummaryDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}