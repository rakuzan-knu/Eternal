import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { MessageType } from '@prisma/client';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Text body of the message' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  body?: string;

  @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({ description: 'Message being replied to' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({ description: 'Original message being forwarded' })
  @IsOptional()
  @IsUUID()
  forwardedFromId?: string;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  body!: string;
}

export class ForwardMessageDto {
  @ApiProperty({ description: 'Conversation IDs to forward to' })
  @IsUUID(undefined, { each: true })
  conversationIds!: string[];
}

export class ReactToMessageDto {
  @ApiProperty({ description: 'Unicode emoji character(s)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  emoji!: string;
}

export class PinMessageDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  messageId!: string;
}

export class DeleteMessageDto {
  @ApiPropertyOptional({ description: 'Delete for everyone (only sender or admin)' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  forAll?: boolean;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Cursor (message id) for pagination' })
  @IsOptional()
  @IsUUID()
  before?: string;

  @ApiPropertyOptional({ description: 'Cursor (message id) for pagination' })
  @IsOptional()
  @IsUUID()
  after?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}

export class SearchMessagesQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  q!: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 30;
}

export class ReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  messageId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  details?: string;
}
