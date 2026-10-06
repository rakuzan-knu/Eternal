import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { equipNameplateSchema } from '../common/contracts/nameplates';
import { NameplatesService } from './nameplates.service';

@Controller('nameplates')
export class NameplatesController {
  constructor(private readonly nameplates: NameplatesService) {}
  @Get() catalog() {
    return this.nameplates.catalog();
  }
  @Get('me')
  @UseGuards(AuthGuard)
  inventory(@CurrentUser() user: RequestUser) {
    return this.nameplates.inventory(user.id);
  }
  @Patch('me/active')
  @UseGuards(AuthGuard)
  equip(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(equipNameplateSchema)) body: { nameplateId: string | null },
  ) {
    return this.nameplates.equip(user.id, body.nameplateId);
  }
}
