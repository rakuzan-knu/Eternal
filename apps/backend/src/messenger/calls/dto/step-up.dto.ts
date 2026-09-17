import { IsString, IsIn, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StepUpAction } from '../calls-step-up.service';

const STEP_UP_ACTIONS: StepUpAction[] = ['RECORD_CALL', 'TRANSFER_ADMIN', 'SENSITIVE_SHARE'];

export class CreateStepUpChallengeDto {
  @ApiProperty({ description: 'Call UUID' })
  @IsString()
  callId!: string;

  @ApiProperty({ enum: STEP_UP_ACTIONS, description: 'Target sensitive in-call action' })
  @IsIn(STEP_UP_ACTIONS)
  action!: StepUpAction;
}

export class AuthenticatorAssertionResponseDetailsDto {
  @ApiPropertyOptional({ description: 'Base64 clientDataJSON' })
  @IsOptional()
  @IsString()
  clientDataJSON?: string;

  @ApiPropertyOptional({ description: 'Base64 authenticatorData' })
  @IsOptional()
  @IsString()
  authenticatorData?: string;

  @ApiPropertyOptional({ description: 'Base64 signature' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Base64 userHandle' })
  @IsOptional()
  @IsString()
  userHandle?: string;
}

export class AuthenticatorAssertionResponseDto {
  @ApiProperty({ description: 'Credential ID' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: 'Raw credential ID base64' })
  @IsOptional()
  @IsString()
  rawId?: string;

  @ApiPropertyOptional({ description: 'Assertion response components' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AuthenticatorAssertionResponseDetailsDto)
  response?: AuthenticatorAssertionResponseDetailsDto;

  @ApiPropertyOptional({ description: 'Credential type' })
  @IsOptional()
  @IsString()
  type?: string;
}

export class VerifyStepUpAssertionDto {
  @ApiProperty({ description: 'Call UUID' })
  @IsString()
  callId!: string;

  @ApiProperty({ enum: STEP_UP_ACTIONS, description: 'Target sensitive in-call action' })
  @IsIn(STEP_UP_ACTIONS)
  action!: StepUpAction;

  @ApiProperty({ description: 'WebAuthn challenge string' })
  @IsString()
  challenge!: string;

  @ApiProperty({ description: 'WebAuthn assertion credential object' })
  @IsObject()
  @ValidateNested()
  @Type(() => AuthenticatorAssertionResponseDto)
  assertionResponse!: AuthenticatorAssertionResponseDto;
}
