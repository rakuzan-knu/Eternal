import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Account password to confirm deletion' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
