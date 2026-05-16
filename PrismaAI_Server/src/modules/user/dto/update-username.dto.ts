// src/modules/user/dto/update-username.dto.ts

import { IsString, Length } from 'class-validator';

export class UpdateUsernameDto {
  @IsString()
  @Length(3, 12)
  username: string;
}
