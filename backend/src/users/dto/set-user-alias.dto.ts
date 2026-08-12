import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetUserAliasDto {
  @ApiProperty({ description: 'Custom private alias/nickname for target user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  alias!: string;
}
