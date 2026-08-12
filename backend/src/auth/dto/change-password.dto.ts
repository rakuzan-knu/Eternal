import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'The current account password' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ description: 'The new password (8-72 chars)' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
