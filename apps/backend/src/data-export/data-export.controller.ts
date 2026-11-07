import { Body, Controller, Header, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { coreDataExportRequestSchema, messengerDataExportRequestSchema } from '@common/contracts';
import type {
  CoreDataExportRequest,
  DataExportPage,
  MessengerDataExportRequest,
} from '@common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SkipIdempotency } from '../common/idempotency/idempotency.decorator';
import { DataExportService } from './data-export.service';

@ApiTags('Data export')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@SkipIdempotency()
@Controller('users/me/data-export')
export class CoreDataExportController {
  constructor(private readonly exports: DataExportService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Throttle({ default: { limit: 10, ttl: 60_000 }, sensitive: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Download one bounded page of your account data' })
  download(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(coreDataExportRequestSchema)) request: CoreDataExportRequest,
  ): Promise<DataExportPage> {
    return this.exports.core(user.id, request);
  }
}

@ApiTags('Data export')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@SkipIdempotency()
@Controller('messenger/me/data-export')
export class MessengerDataExportController {
  constructor(private readonly exports: DataExportService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Throttle({ default: { limit: 10, ttl: 60_000 }, sensitive: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Download one bounded page of your eligible sent messages' })
  download(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(messengerDataExportRequestSchema))
    request: MessengerDataExportRequest,
  ): Promise<DataExportPage> {
    return this.exports.messenger(user.id, request);
  }
}
