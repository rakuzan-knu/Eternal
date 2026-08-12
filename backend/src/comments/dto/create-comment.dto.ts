import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Great post!',
    description: 'Text of the comment',
    minLength: 1,
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;

  @ApiPropertyOptional({
    example: 'cuid...',
    description: 'Optional parent comment ID for replies',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
