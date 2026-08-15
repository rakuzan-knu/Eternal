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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrivacyDimension } from '@prisma/client';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { PrivacyService } from './privacy.service';
import {
  type AddPrivacyExceptionDto,
  DimensionExceptionsDto,
  type PrivacySettingsDto,
  type UpdatePrivacyDto,
  addPrivacyExceptionSchema,
  updatePrivacySchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Privacy')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users/me/privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my privacy settings' })
  @ApiResponse({ status: 200 })
  getMyPrivacy(@CurrentUser() user: RequestUser): Promise<PrivacySettingsDto> {
    return this.privacyService.getMyPrivacy(user.id);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update my privacy settings' })
  @ApiResponse({ status: 200 })
  updateMyPrivacy(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updatePrivacySchema)) dto: UpdatePrivacyDto,
  ): Promise<PrivacySettingsDto> {
    return this.privacyService.updateMyPrivacy(user.id, dto);
  }

  @Get('exceptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List allow/deny exceptions for a dimension' })
  @ApiQuery({ name: 'dimension', enum: PrivacyDimension })
  @ApiResponse({ status: 200, type: DimensionExceptionsDto })
  listExceptions(
    @CurrentUser() user: RequestUser,
    @Query('dimension') dimension: PrivacyDimension,
  ): Promise<DimensionExceptionsDto> {
    return this.privacyService.listExceptions(user.id, dimension);
  }

  @Post('exceptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add or update an allow/deny exception' })
  @ApiResponse({ status: 204, description: 'Exception saved' })
  addException(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(addPrivacyExceptionSchema)) dto: AddPrivacyExceptionDto,
  ): Promise<void> {
    return this.privacyService.addException(user.id, dto.dimension, dto.targetId, dto.mode);
  }

  @Delete('exceptions/:dimension/:targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an exception' })
  @ApiResponse({ status: 204, description: 'Exception removed' })
  removeException(
    @CurrentUser() user: RequestUser,
    @Param('dimension') dimension: PrivacyDimension,
    @Param('targetId') targetId: string,
  ): Promise<void> {
    return this.privacyService.removeException(user.id, dimension, targetId);
  }
}
