import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsUrl,
} from 'class-validator';
import { MessageType, AttachmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsValidMessage } from '../decorators/is-valid-message.decorator';

export class ConversationIdDto {
  @ApiProperty({ description: 'Chat ID' })
  @IsUUID()
  @IsNotEmpty()
  conversationId!: string;
}

export class AttachmentDto {
  @ApiProperty({ enum: AttachmentType, description: 'Media-file type' })
  @IsEnum(AttachmentType)
  type!: AttachmentType;

  @ApiProperty({ description: 'Direct link to saved file' })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

@IsValidMessage()
export class SendMessageDto {
  @ApiProperty({ description: 'The ID of the conversation where the message is sent' })
  @IsUUID()
  @IsNotEmpty()
  conversationId!: string;

  @ApiPropertyOptional({ description: 'Messages Text' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  text?: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({ description: 'ID of the message to which a response is being created' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({ description: 'Original message ID when forwarding' })
  @IsOptional()
  @IsUUID()
  forwardedFromId?: string;

  @ApiPropertyOptional({ type: [AttachmentDto], description: 'Array of media attachments' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class EditMessageDto {
  @ApiProperty({ description: 'ID of the message being edited' })
  @IsUUID()
  @IsNotEmpty()
  messageId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  body!: string;
}

export class DeleteMessageDto {
  @ApiProperty({ description: 'ID of the message to be deleted' })
  @IsUUID()
  @IsNotEmpty()
  messageId!: string;

  @ApiPropertyOptional({ description: 'Delete for everyone (only sender or admin)' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  forAll?: boolean;
}

export class ForwardMessageDto {
  @ApiProperty({ description: 'Original message ID' })
  @IsUUID()
  @IsNotEmpty()
  messageId!: string;

  @ApiProperty({ description: 'Conversation IDs to forward to' })
  @IsUUID(undefined, { each: true })
  conversationIds!: string[];
}

export class ReactToMessageDto {
  @ApiProperty({ description: 'Message ID' })
  @IsUUID()
  @IsNotEmpty()
  messageId!: string;

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

export class TogglePinMessageDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  conversationId!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  messageId!: string;
}

export class MarkReadDto extends ConversationIdDto {
  @ApiPropertyOptional({ description: 'ID of a specific message (optional)' })
  @IsOptional()
  @IsUUID()
  messageId?: string;
}

export class GetOnlineStatusDto {
  @ApiProperty({ description: 'User IDs to check', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds!: string[];
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
