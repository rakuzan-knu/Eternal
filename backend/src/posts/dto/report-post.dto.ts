import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportCategory } from '@prisma/client';

export class ReportPostDto {
  @ApiProperty({ enum: ReportCategory, example: ReportCategory.SPAM })
  @IsEnum(ReportCategory)
  category!: ReportCategory;

  @ApiPropertyOptional({ example: 'This post contains spam content' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
