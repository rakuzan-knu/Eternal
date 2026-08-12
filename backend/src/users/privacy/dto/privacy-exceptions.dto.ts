import { ApiProperty } from '@nestjs/swagger';

export class PrivacyExceptionUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty({ nullable: true }) displayName!: string | null;
  @ApiProperty({ nullable: true }) avatar!: string | null;
}

export class DimensionExceptionsDto {
  @ApiProperty({ type: [PrivacyExceptionUserDto] })
  allow!: PrivacyExceptionUserDto[];

  @ApiProperty({ type: [PrivacyExceptionUserDto] })
  deny!: PrivacyExceptionUserDto[];
}
