import { IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class SteamAuthStartDto {
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false })
  origin!: string;
}

export class SteamAuthLaunchDto {
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
