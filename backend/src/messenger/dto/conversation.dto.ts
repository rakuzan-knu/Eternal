import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
} from 'class-validator';
import { MuteLevel } from '@prisma/client';

export class CreateDirectConversationDto {
  @ApiProperty({ description: 'ID of the other user' })
  @IsUUID()
  @IsNotEmpty()
  participantId!: string;
}

export class CreateGroupConversationDto {
  @ApiProperty({ description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiProperty({ description: 'Initial member user IDs (excluding creator)' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  memberIds!: string[];
}

export class UpdateGroupConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;
}

export class SetNicknameDto {
  @ApiProperty({ description: 'Target user ID in this conversation' })
  @IsUUID()
  @IsNotEmpty()
  targetUserId!: string;

  @ApiPropertyOptional({ description: 'Nickname to assign (null to clear)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string | null;
}

export class SetThemeDto {
  @ApiProperty({ description: 'Theme color key' })
  @IsString()
  @IsNotEmpty()
  theme!: string;
}

export class MuteConversationDto {
  @ApiProperty({ enum: MuteLevel })
  @IsEnum(MuteLevel)
  muteLevel!: MuteLevel;

  @ApiPropertyOptional({ description: 'ISO date until when muted; omit for permanent' })
  @IsOptional()
  @IsString()
  mutedUntil?: string;
}

export class AddMembersDto {
  @ApiProperty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  memberIds!: string[];
}

export class TransferOwnershipDto {
  @ApiProperty()
  @IsUUID()
  newOwnerId!: string;
}

export class PromoteMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;
}
