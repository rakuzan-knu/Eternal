import { IsString, IsNumber, IsOptional, Min, Max, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCallTelemetryDto {
  @ApiProperty({ description: 'Call UUID' })
  @IsString()
  callId!: string;

  @ApiProperty({ description: 'Average RTT in ms' })
  @IsNumber()
  @Min(0)
  avgRttMs!: number;

  @ApiPropertyOptional({ description: 'Max RTT in ms' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRttMs?: number;

  @ApiProperty({ description: 'Packet loss ratio between 0 and 1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  packetLossRatio!: number;

  @ApiPropertyOptional({ description: 'Jitter in ms' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  jitterMs?: number;

  @ApiPropertyOptional({ description: 'Audio codec used (e.g. opus)' })
  @IsOptional()
  @IsString()
  audioCodec?: string;

  @ApiPropertyOptional({ description: 'Video codec used (e.g. VP9, AV1, H264)' })
  @IsOptional()
  @IsString()
  videoCodec?: string;

  @ApiProperty({ description: 'Call duration in milliseconds' })
  @IsInt()
  @Min(0)
  durationMs!: number;

  @ApiPropertyOptional({ description: 'End reason' })
  @IsOptional()
  @IsString()
  endReason?: string;
}
