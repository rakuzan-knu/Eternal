import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { cleanUsername } from '../../common/transformers';

export class CheckUsernameDto {
  @ApiProperty({ example: 'ayate' })
  @Transform(cleanUsername)
  @IsString()
  @IsNotEmpty()
  username!: string;
}
