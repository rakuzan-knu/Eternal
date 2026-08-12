import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutoDeletePeriod, ExceptionMode, PrivacyDimension, Visibility } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class PrivacySettingsDto {
  @ApiProperty({ enum: Visibility }) lastSeen!: Visibility;
  @ApiProperty({ enum: Visibility }) avatar!: Visibility;
  @ApiProperty({ enum: Visibility }) banner!: Visibility;
  @ApiProperty({ enum: Visibility }) forwardLink!: Visibility;
  @ApiProperty({ enum: Visibility }) calls!: Visibility;
  @ApiProperty({ enum: Visibility }) voiceMessages!: Visibility;
  @ApiProperty({ enum: Visibility }) messages!: Visibility;
  @ApiProperty({ enum: Visibility }) birthday!: Visibility;
  @ApiProperty({ enum: Visibility }) bio!: Visibility;
  @ApiProperty({ enum: Visibility }) groupInvites!: Visibility;
  @ApiProperty() isPrivate!: boolean;
  @ApiProperty({ enum: AutoDeletePeriod }) autoDeletePeriod!: AutoDeletePeriod;
}

export class UpdatePrivacyDto {
  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  lastSeen?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  avatar?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  banner?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  forwardLink?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  calls?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  voiceMessages?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  messages?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  birthday?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  bio?: Visibility;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  groupInvites?: Visibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ enum: AutoDeletePeriod })
  @IsOptional()
  @IsEnum(AutoDeletePeriod)
  autoDeletePeriod?: AutoDeletePeriod;
}

export class AddPrivacyExceptionDto {
  @ApiProperty({ enum: PrivacyDimension })
  @IsEnum(PrivacyDimension)
  dimension!: PrivacyDimension;

  @ApiProperty()
  @IsString()
  targetId!: string;

  @ApiProperty({ enum: ExceptionMode })
  @IsEnum(ExceptionMode)
  mode!: ExceptionMode;
}
