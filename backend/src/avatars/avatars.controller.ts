import {
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
import { AvatarsService } from './avatars.service';
import type { AvatarView } from './interfaces/avatars-repository.interface';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('Avatars')
@Controller('users/:id/avatar')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload avatar for a user' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'User not found' })
  upload(
    @Param('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AvatarView> {
    return this.avatarsService.uploadAvatar(userId, file);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete avatar of a user' })
  @ApiResponse({ status: 200, description: 'Avatar deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  delete(@Param('id') userId: string): Promise<AvatarView> {
    return this.avatarsService.deleteAvatar(userId);
  }
}
