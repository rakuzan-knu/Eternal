import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SelfHealTriggerDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  @Type(() => Number)
  threshold?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  patterns?: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}
