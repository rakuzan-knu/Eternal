import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { MediaType } from '@prisma/client';

export class MediaDto {
  @ApiProperty({ enum: MediaType, example: MediaType.IMAGE })
  @IsEnum(MediaType)
  type!: MediaType;

  @ApiProperty({ example: 'https://cdn.example.com/media.jpg' })
  @IsString()
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/poster.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  poster?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreatePostDto {
  @ApiPropertyOptional({
    example: 'My first post',
    description: 'Post content caption (optional when media or poll is attached)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : (value ?? ''),
  )
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [MediaDto], description: 'Optional media items' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];

  @ApiPropertyOptional({ description: 'Optional GIF URLs (array or JSON string)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as string[]) : [value];
      } catch {
        return [value];
      }
    }
    if (Array.isArray(value)) return value as string[];
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  gifUrls?: string[];

  @ApiPropertyOptional({ description: 'Optional poll option strings (array or JSON string)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as string[]) : [value];
      } catch {
        return [value];
      }
    }
    if (Array.isArray(value)) return value as string[];
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  poll?: string[];
}
