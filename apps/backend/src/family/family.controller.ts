import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { FamilyService } from './family.service';
import { FamilySafeguardService } from './family-safeguard.service';
import { BypassCurfew } from './decorators/bypass-curfew.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { ChildSafeguards, FamilySettingsDto } from './family.types';

const curfewTime = z.union([
  z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  z.literal(''),
  z.null(),
]);
const timeZone = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  });
const safeguardPatch = z
  .object({
    dailyLimitMinutes: z.number().int().min(0).max(1440),
    curfewStart: curfewTime,
    curfewEnd: curfewTime,
    timezone: timeZone,
    curfewTimezone: timeZone,
    restrictedDirectMessages: z.boolean(),
    monthlyBudget: z.number().nonnegative(),
    requirePurchaseApproval: z.boolean(),
    profileSettingsLocked: z.boolean(),
    profileLockedByParent: z.boolean(),
  })
  .partial()
  .transform((input) => {
    const patch: Partial<
      Omit<ChildSafeguards, 'childId' | 'updatedByParentId' | 'updatedAt' | 'spentThisMonth'>
    > = {};
    const timezone = input.timezone ?? input.curfewTimezone;
    const profileLock = input.profileSettingsLocked ?? input.profileLockedByParent;
    if (timezone !== undefined) patch.timezone = timezone;
    if (profileLock !== undefined) patch.profileSettingsLocked = profileLock;
    if (input.dailyLimitMinutes !== undefined) patch.dailyLimitMinutes = input.dailyLimitMinutes;
    if (input.curfewStart !== undefined) patch.curfewStart = input.curfewStart;
    if (input.curfewEnd !== undefined) patch.curfewEnd = input.curfewEnd;
    if (input.restrictedDirectMessages !== undefined)
      patch.restrictedDirectMessages = input.restrictedDirectMessages;
    if (input.monthlyBudget !== undefined) patch.monthlyBudget = input.monthlyBudget;
    if (input.requirePurchaseApproval !== undefined)
      patch.requirePurchaseApproval = input.requirePurchaseApproval;
    return patch;
  });

@ApiTags('Family Center')
@Controller('family')
@UseGuards(AuthGuard)
@BypassCurfew() // Guarantee child/parent can always access Family Center even during curfew
@ApiBearerAuth()
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly safeguardService: FamilySafeguardService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get Family Center notification and PIN settings' })
  async getSettings(@CurrentUser() user: RequestUser) {
    return this.familyService.getFamilySettings(user.id);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update Family Center notification and PIN settings' })
  async updateSettings(@CurrentUser() user: RequestUser, @Body() body: Partial<FamilySettingsDto>) {
    return this.familyService.updateFamilySettings(user.id, body);
  }

  @Post('invite/qr')
  @ApiOperation({ summary: 'Generate pairing QR code and token by child' })
  async generatePairQr(@CurrentUser() user: RequestUser) {
    return this.familyService.generatePairQr(user.id);
  }

  @Post('pair')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate pairing by scanning QR or submitting pairing code (Parent)' })
  async pair(@CurrentUser() user: RequestUser, @Body('code') code: string, @Req() req: any) {
    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return this.familyService.pair(user.id, code, clientIp);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm or decline pairing request on child device' })
  async confirmPair(
    @CurrentUser() user: RequestUser,
    @Body('linkId') linkId: string,
    @Body('approved') approved: boolean,
  ) {
    return this.familyService.confirmPair(user.id, linkId, approved);
  }

  @Get('pending-invite')
  @ApiOperation({
    summary: 'Fallback query to restore pending pair prompt after network reconnect',
  })
  async getPendingInvite(@CurrentUser() user: RequestUser) {
    return this.familyService.getPendingInvite(user.id);
  }

  @Get('members')
  @ApiOperation({ summary: 'List family connections, connected children or parents' })
  async getMembers(@CurrentUser() user: RequestUser) {
    return this.familyService.getMembers(user.id);
  }

  @Delete('members/:id')
  @ApiOperation({ summary: 'Revoke family link (accessible by both child and parent)' })
  async revokeLink(@CurrentUser() user: RequestUser, @Param('id') linkId: string) {
    return this.familyService.revokeFamilyLink(user.id, linkId);
  }

  @Get('my-activity')
  @ApiOperation({ summary: 'Get current user activity telemetry' })
  async getMyActivity(@CurrentUser() user: RequestUser) {
    return this.familyService.getActivitySummary(user.id, user.id);
  }

  @Get('children/:id/activity-summary')
  @ApiOperation({ summary: 'Get privacy-preserving 7-day telemetry report' })
  async getActivitySummary(@CurrentUser() user: RequestUser, @Param('id') childId: string) {
    return this.familyService.getActivitySummary(childId, user.id);
  }

  @Get('children/:id/safeguards')
  @ApiOperation({ summary: 'Get single source of truth safeguards for child' })
  getSafeguards(@CurrentUser() user: RequestUser, @Param('id') childId: string) {
    if (user.id !== childId && !this.familyService.isActiveParentOf(user.id, childId)) {
      throw new ForbiddenException('You do not have permission to view these safeguards.');
    }
    return this.safeguardService.getSafeguards(childId);
  }

  @Put('children/:id/safeguards')
  @ApiOperation({ summary: 'Update parental safeguards (screen time, spending, DMs)' })
  updateSafeguards(
    @CurrentUser() user: RequestUser,
    @Param('id') childId: string,
    @Body(new ZodValidationPipe(safeguardPatch)) body: z.output<typeof safeguardPatch>,
  ) {
    if (!this.familyService.isActiveParentOf(user.id, childId)) {
      throw new ForbiddenException('You do not have permission to change these safeguards.');
    }
    return this.safeguardService.updateSafeguards(childId, user.id, body);
  }
}
