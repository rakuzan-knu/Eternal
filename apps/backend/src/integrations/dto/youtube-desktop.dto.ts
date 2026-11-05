import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class YouTubeDesktopStartDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  challenge!: string;
}

export class YouTubeDesktopLaunchDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  ticket!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  proof!: string;

  @IsString()
  @MaxLength(2048)
  origin!: string;
}

export class YouTubeDesktopCallbackDto {
  @IsString()
  @Matches(/^youtube:[a-f0-9]{64}$/)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  error?: string;
}

export class YouTubeDesktopRedeemDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  code!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  transaction!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  verifier!: string;
}
