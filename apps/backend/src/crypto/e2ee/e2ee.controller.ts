import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { E2eeService } from './e2ee.service';
import {
  KeyExchangeInitDto,
  KeyExchangeResultDto,
  PublicKeyResponseDto,
  RegisterPublicKeyDto,
} from './dto/e2ee.dto';

@ApiTags('e2ee')
@ApiBearerAuth()
@Controller('e2ee')
@UseGuards(AuthGuard)
export class E2eeController {
  constructor(private readonly e2eeService: E2eeService) {}

  @Post('keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or update current user E2EE public key' })
  @ApiResponse({ status: 200, type: PublicKeyResponseDto })
  async registerKey(
    @CurrentUser() user: RequestUser,
    @Body() dto: RegisterPublicKeyDto,
  ): Promise<PublicKeyResponseDto> {
    return this.e2eeService.registerPublicKey(user.id, dto);
  }

  @Get('keys/:userId')
  @ApiOperation({ summary: 'Retrieve E2EE public key for a chat recipient' })
  @ApiResponse({ status: 200, type: PublicKeyResponseDto })
  @ApiResponse({ status: 404, description: 'Public key not found' })
  async getKey(
    @Param('userId') userId: string,
    @Query('purpose') purpose?: string,
  ): Promise<PublicKeyResponseDto> {
    const key = await this.e2eeService.getPublicKey(userId, purpose ?? 'call');
    if (!key) {
      throw new NotFoundException('Public key not found for user');
    }
    return key;
  }

  @Get('keys/:userId/devices')
  @ApiOperation({
    summary: 'List all E2EE device keys for a user (multi-device fan-out)',
  })
  @ApiResponse({ status: 200, description: 'Device key list (possibly empty)' })
  async getDevices(
    @Param('userId') userId: string,
    @Query('purpose') purpose?: string,
  ): Promise<{ userId: string; purpose: string; keys: PublicKeyResponseDto[] }> {
    const slot = purpose === 'message' ? 'message' : 'call';
    const keys = await this.e2eeService.getPublicKeys(userId, slot);
    return { userId, purpose: slot, keys };
  }

  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Relay an E2EE key exchange handshake bundle to recipient' })
  @ApiResponse({ status: 200, type: KeyExchangeResultDto })
  async initiateExchange(
    @CurrentUser() user: RequestUser,
    @Body() dto: KeyExchangeInitDto,
  ): Promise<KeyExchangeResultDto> {
    return this.e2eeService.initiateKeyExchange(user.id, dto);
  }
}
