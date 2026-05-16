// src/modules/user/dto/update-photo.dto.ts

import { IsString } from 'class-validator';

export class UpdatePhotoDto {
  @IsString()
  profilePhoto: string;
}
