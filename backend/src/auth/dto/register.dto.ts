import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { cleanUsername, trimAndLowercase, trimString } from '../../common/transformers';
import { HARDENED_USERNAME_REGEX, RESERVED_USERNAMES } from '../../users/dto/update-users.dto';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(trimAndLowercase)
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'john_doe', minLength: 2, maxLength: 32 })
  @Transform(cleanUsername)
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(HARDENED_USERNAME_REGEX, {
    message:
      'Username must be 2-32 characters, cannot start/end with . or _, and cannot contain consecutive dots or underscores.',
  })
  @IsNotIn(RESERVED_USERNAMES, { message: 'This username is reserved and cannot be used.' })
  username!: string;

  @ApiPropertyOptional({ example: 'John Doe', maxLength: 64 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(64)
  displayName?: string;

  @ApiProperty({ example: 'StrongP@ssw0rd', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ example: '1997-12-18T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
