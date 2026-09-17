import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { PrekeysService } from './prekeys.service';
import {
  type UploadPrekeysDto,
  type ReplenishPrekeysDto,
  uploadPrekeysSchema,
  replenishPrekeysSchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Messenger / Crypto / Prekeys')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('crypto/prekeys')
export class PrekeysController {
  constructor(private readonly prekeysService: PrekeysService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Upload or update user Prekey bundle (Identity, Signed Prekey, OPKs)' })
  uploadBundle(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(uploadPrekeysSchema)) dto: UploadPrekeysDto,
  ) {
    return this.prekeysService.uploadBundle(user.id, dto);
  }

  @Get('status/count')
  @ApiOperation({ summary: 'Get remaining One-Time Prekey count for current user' })
  async getRemainingCount(@CurrentUser() user: RequestUser) {
    const count = await this.prekeysService.getRemainingCount(user.id);
    return { count };
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Consume and fetch target user Prekey bundle for X3DH handshake' })
  getPrekeyBundle(@Param('userId') targetUserId: string) {
    return this.prekeysService.getPrekeyBundle(targetUserId);
  }

  @Post('replenish')
  @ApiOperation({ summary: 'Replenish One-Time Prekeys pool' })
  async replenishPrekeys(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(replenishPrekeysSchema)) dto: ReplenishPrekeysDto,
  ) {
    const remaining = await this.prekeysService.replenishPrekeys(user.id, dto);
    return { remaining };
  }
}
