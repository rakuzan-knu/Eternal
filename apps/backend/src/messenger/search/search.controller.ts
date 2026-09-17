import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { SearchService } from './search.service';
import { type GlobalSearchDto, globalSearchSchema } from '@common/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Messenger / Search')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('conversations/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global instant search across messages, media, files, and users' })
  search(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(globalSearchSchema)) dto: GlobalSearchDto,
  ) {
    return this.searchService.search(user.id, dto);
  }
}
