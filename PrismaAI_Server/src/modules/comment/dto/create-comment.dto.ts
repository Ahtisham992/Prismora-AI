// src/modules/comment/dto/create-comment.dto.ts

import { IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  text: string;
}
