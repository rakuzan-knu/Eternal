import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditPostDto {
  @ApiPropertyOptional({
    example: 'Updated post content',
    description: 'Updated text content of the post',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/image.jpg',
    description: 'Updated image URL',
  })
  @IsOptional()
  @IsUrl()
  image?: string;
}
