import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { trimAndLowercase, trimString } from '../../common/transformers';

export class LoginDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @Transform(trimAndLowercase)
  email?: string;

  @ApiPropertyOptional({ example: 'user@example.com or @username' })
  @IsOptional()
  @Transform(trimString)
  identity?: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @MinLength(8)
  password!: string;
}
