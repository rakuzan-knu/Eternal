import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { equipDecorationSchema } from '../common/contracts/decorations';
import { DecorationsService } from './decorations.service';

@Controller('decorations')
export class DecorationsController {
  constructor(private readonly decorations: DecorationsService) {}

  @Get()
  catalog() {
    return this.decorations.catalog();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  inventory(@CurrentUser() user: RequestUser) {
    return this.decorations.inventory(user.id);
  }

  @Post(':id/claim')
  @UseGuards(AuthGuard)
  claim(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.decorations.claimFree(user.id, id);
  }

  @Patch('me/active')
  @UseGuards(AuthGuard)
  equip(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(equipDecorationSchema)) body: { decorationId: string | null },
  ) {
    return this.decorations.equip(user.id, body.decorationId);
  }
}
