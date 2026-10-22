import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { directUploadSchema, type DirectUploadInput } from './direct-upload.contract';
import { DirectUploadsService } from './direct-uploads.service';
import { MediaBudgetService } from './media-budget.service';

@Controller('uploads/direct')
@UseGuards(AuthGuard)
export class DirectUploadsController {
  constructor(
    private readonly uploads: DirectUploadsService,
    private readonly budget: MediaBudgetService,
  ) {}
  @Post()
  @Throttle({ sensitive: { limit: 10, ttl: 60_000 } })
  start(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(directUploadSchema)) body: DirectUploadInput,
  ) {
    return this.uploads.start(user.id, body);
  }
  @Get('private/:id')
  @Header('Cache-Control', 'private, no-store')
  downloadPrivate(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.uploads.downloadPrivate(user.id, id);
  }

  @Get('quota')
  status(@CurrentUser() user: RequestUser) {
    return this.budget.getStatus(user.id);
  }
  @Post(':uploadId/complete')
  complete(@CurrentUser() user: RequestUser, @Param('uploadId') id: string) {
    return this.uploads.complete(user.id, id);
  }
  @Delete(':uploadId')
  async abort(@CurrentUser() user: RequestUser, @Param('uploadId') id: string) {
    await this.uploads.abort(user.id, id);
    return { success: true };
  }
}
