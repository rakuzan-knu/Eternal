import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { equipProfileFrameSchema } from '../common/contracts/profile-frames';
import { ProfileFramesService } from './profile-frames.service';

@Controller('profile-frames')
export class ProfileFramesController {
  constructor(private readonly profileFrames: ProfileFramesService) {}
  @Get() catalog() {
    return this.profileFrames.catalog();
  }
  @Get('me')
  @UseGuards(AuthGuard)
  inventory(@CurrentUser() user: RequestUser) {
    return this.profileFrames.inventory(user.id);
  }
  @Patch('me/active')
  @UseGuards(AuthGuard)
  equip(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(equipProfileFrameSchema)) body: { profileFrameId: string | null },
  ) {
    return this.profileFrames.equip(user.id, body.profileFrameId);
  }
}
