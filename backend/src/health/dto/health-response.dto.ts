import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsString } from 'class-validator';

export class HealthServicesStatusDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  @IsEnum(['ok', 'error'])
  database!: 'ok' | 'error';

  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  @IsEnum(['ok', 'error'])
  redis!: 'ok' | 'error';
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded', 'error'] })
  @IsEnum(['ok', 'degraded', 'error'])
  status!: 'ok' | 'degraded' | 'error';

  @ApiProperty({ example: '2026-08-13T12:00:00.000Z' })
  @IsString()
  timestamp!: string;

  @ApiProperty({ example: 123.45 })
  @IsNumber()
  uptime!: number;

  @ApiProperty({ type: HealthServicesStatusDto })
  @IsObject()
  services!: HealthServicesStatusDto;
}

export class PingResponseDto {
  @ApiProperty({ example: 'ok' })
  @IsString()
  status!: string;

  @ApiProperty({ example: '2026-08-13T12:00:00.000Z' })
  @IsString()
  timestamp!: string;
}
