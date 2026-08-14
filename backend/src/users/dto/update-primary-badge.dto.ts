import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePrimaryBadgeDto {
  @ApiPropertyOptional({
    example: 'DEVELOPER',
    description: 'Badge ID to activate as primary, or null/empty to clear',
  })
  @IsOptional()
  @IsString()
  badgeId?: string | null;
}
