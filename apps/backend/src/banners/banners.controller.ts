import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { BannersService } from './banners.service';
import type { BannerView } from './interfaces/banners-repository.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function parsePosition(raw?: string): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

@ApiTags('Banners')
@Controller('users/:id/banner')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        bannerPosition: { type: 'number' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload banner for a user' })
  @ApiResponse({ status: 200, description: 'Banner uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'User not found' })
  upload(
    @Param('id') userId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('bannerPosition') bannerPosition?: string,
  ): Promise<BannerView> {
    if (user.id !== userId) throw new ForbiddenException('You can only upload your own banner');
    return this.bannersService.uploadBanner(userId, file, parsePosition(bannerPosition));
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete banner of a user' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  delete(@Param('id') userId: string, @CurrentUser() user: RequestUser): Promise<BannerView> {
    if (user.id !== userId) throw new ForbiddenException('You can only delete your own banner');
    return this.bannersService.deleteBanner(userId);
  }
}
