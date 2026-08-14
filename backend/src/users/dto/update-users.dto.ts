import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import sanitizeHtmlLib from 'sanitize-html';
import {
  IsEmail,
  IsNotIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const RESERVED_USERNAMES = [
  'settings',
  'login',
  'register',
  'explore',
  'music',
  'messages',
  'messenger',
  'feed',
  'profile',
  'terms',
  'privacy',
  'notifications',
  'search',
  'reels',
  'create',
  'null',
  'undefined',
  'api',
  'admin',
  'support',
  'system',
  'official',
  'help',
  'staff',
  'moderator',
  'security',
  'eternal',
  'administrator',
  'me',
  'you',
  'root',
  'helpdesk',
  'contact',
  'info',
  'business',
  'marketing',
  'design',
  'developer',
  'engineering',
  'system',
  'official',
  'account',
  'user',
  'test',
  'real',
  'verified',
  'mod',
  'moderator',
  'staff',
];

export const HARDENED_USERNAME_REGEX = /^(?![._])(?!.*[._]{2})[a-zA-Z0-9._]{2,32}(?<![._])$/;

function sanitizeHtml(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return sanitizeHtmlLib(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'newemail@example.com' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'new_username', minLength: 2, maxLength: 32 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (sanitizeHtml(value.toLowerCase()) as string) : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(HARDENED_USERNAME_REGEX, {
    message:
      'Username must be 2-32 characters, cannot start/end with . or _, and cannot contain consecutive dots or underscores.',
  })
  @IsNotIn(RESERVED_USERNAMES, { message: 'This username is reserved and cannot be used.' })
  username?: string;

  @ApiPropertyOptional({ example: 'New Display Name', maxLength: 32 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeHtml(value) as string)
  @IsString()
  @MaxLength(32)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Full-stack developer from Kyiv', maxLength: 200 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeHtml(value) as string)
  @IsString()
  @MaxLength(200)
  bio?: string;
}
