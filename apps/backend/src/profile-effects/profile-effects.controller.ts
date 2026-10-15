import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { equipProfileEffectSchema } from '../common/contracts/profile-effects';
import { ProfileEffectsService } from './profile-effects.service';

@Controller('profile-effects')
export class ProfileEffectsController {
  constructor(private readonly profileEffects: ProfileEffectsService) {}
  @Get() catalog() {
    return this.profileEffects.catalog();
  }
  @Get('me')
  @UseGuards(AuthGuard)
  inventory(@CurrentUser() user: RequestUser) {
    return this.profileEffects.inventory(user.id);
  }
  @Patch('me/active')
  @UseGuards(AuthGuard)
  equip(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(equipProfileEffectSchema)) body: { profileEffectId: string | null },
  ) {
    return this.profileEffects.equip(user.id, body.profileEffectId);
  }
}
