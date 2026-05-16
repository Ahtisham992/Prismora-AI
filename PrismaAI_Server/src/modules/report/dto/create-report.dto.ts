// src/modules/report/dto/create-report.dto.ts

import { IsString, IsOptional, Length } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @Length(3, 200)
  reason: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  additionalInfo?: string;
}
