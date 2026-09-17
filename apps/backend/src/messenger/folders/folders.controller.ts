import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { FoldersService } from './folders.service';
import {
  type CreateFolderDto,
  type UpdateFolderDto,
  type ReorderFoldersDto,
  createFolderSchema,
  updateFolderSchema,
  reorderFoldersSchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Messenger / Folders')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('conversations/folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all chat folders for current user' })
  getFolders(@CurrentUser() user: RequestUser) {
    return this.foldersService.getFolders(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new chat folder' })
  createFolder(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createFolderSchema)) dto: CreateFolderDto,
  ) {
    return this.foldersService.createFolder(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chat folder' })
  updateFolder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFolderSchema)) dto: UpdateFolderDto,
  ) {
    return this.foldersService.updateFolder(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chat folder' })
  deleteFolder(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.foldersService.deleteFolder(id, user.id);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder chat folders' })
  reorderFolders(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(reorderFoldersSchema)) dto: ReorderFoldersDto,
  ) {
    return this.foldersService.reorderFolders(user.id, dto);
  }
}
