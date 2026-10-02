import { Injectable, Logger, ForbiddenException, Optional } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ChildSafeguards } from './family.types';

export function isCurrentTimeInCurfew(
  curfewStart: string,
  curfewEnd: string,
  timezone: string = 'UTC',
  now = new Date(),
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const formatted = formatter.format(now);
    const [currH, currM] = formatted.split(':').map(Number);
    const currMinutes = currH * 60 + currM;

    const [startH, startM] = curfewStart.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = curfewEnd.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currMinutes >= startMinutes && currMinutes < endMinutes;
    } else {
      // Overnight curfew (e.g. 22:00 -> 07:00)
      return currMinutes >= startMinutes || currMinutes < endMinutes;
    }
  } catch {
    return false;
  }
}

@Injectable()
export class FamilySafeguardService {
  private readonly logger = new Logger(FamilySafeguardService.name);

  // In-memory safeguards cache (backed by database / Redis in production)
  private readonly safeguardsMap = new Map<string, ChildSafeguards>();

  constructor(@Optional() private readonly redis?: RedisService) {}

  getSafeguards(childId: string): ChildSafeguards {
    const existing = this.safeguardsMap.get(childId);
    if (existing) return existing;

    const defaultSafeguards: ChildSafeguards = {
      childId,
      dailyLimitMinutes: 120,
      curfewStart: '22:00',
      curfewEnd: '07:00',
      timezone: 'UTC',
      restrictedDirectMessages: true,
      monthlyBudget: 100,
      spentThisMonth: 0,
      requirePurchaseApproval: true,
      profileSettingsLocked: true,
      updatedByParentId: 'system',
      updatedAt: new Date(),
    };
    this.safeguardsMap.set(childId, defaultSafeguards);
    return defaultSafeguards;
  }

  updateSafeguards(
    childId: string,
    parentId: string,
    partial: Partial<Omit<ChildSafeguards, 'childId' | 'updatedByParentId' | 'updatedAt'>>,
  ): ChildSafeguards {
    const current = this.getSafeguards(childId);
    const updated: ChildSafeguards = {
      ...current,
      ...partial,
      childId,
      updatedByParentId: parentId,
      updatedAt: new Date(),
    };
    this.safeguardsMap.set(childId, updated);
    this.logger.log(`Child safeguards updated for ${childId} by parent ${parentId}`);
    return updated;
  }

  async trackScreenTimeTick(childId: string): Promise<number> {
    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `screentime:${childId}:${dateStr}`;
    if (this.redis) {
      try {
        const client = this.redis.getClient();
        const usage = await client.hincrby(key, 'usage', 1);
        await client.expire(key, 86400 * 2); // 2-day retention
        return usage;
      } catch (err) {
        this.logger.warn(`Redis screen time tracking failed: ${(err as Error).message}`);
      }
    }
    return 1;
  }

  async checkScreenTime(childId: string): Promise<{
    isBlocked: boolean;
    reason?: 'CURFEW_HOURS' | 'DAILY_LIMIT_REACHED';
    curfewEnd?: string | null;
    dailyLimitMinutes?: number;
  }> {
    const safeguards = this.getSafeguards(childId);

    // 1. Timezone-aware curfew check
    if (safeguards.curfewStart && safeguards.curfewEnd) {
      const inCurfew = isCurrentTimeInCurfew(
        safeguards.curfewStart,
        safeguards.curfewEnd,
        safeguards.timezone,
      );
      if (inCurfew) {
        return {
          isBlocked: true,
          reason: 'CURFEW_HOURS',
          curfewEnd: safeguards.curfewEnd,
        };
      }
    }

    // 2. Daily screen time quota check (WebSocket presence ticks)
    if (safeguards.dailyLimitMinutes > 0 && this.redis) {
      try {
        const dateStr = new Date().toISOString().slice(0, 10);
        const key = `screentime:${childId}:${dateStr}`;
        const rawUsage = await this.redis.getClient().hget(key, 'usage');
        const usage = rawUsage ? parseInt(rawUsage, 10) : 0;
        if (usage >= safeguards.dailyLimitMinutes) {
          return {
            isBlocked: true,
            reason: 'DAILY_LIMIT_REACHED',
            dailyLimitMinutes: safeguards.dailyLimitMinutes,
          };
        }
      } catch (err) {
        this.logger.warn(`Failed to check screen time usage: ${(err as Error).message}`);
      }
    }

    return { isBlocked: false };
  }

  assertCanDirectMessage(senderId: string, recipientId: string, isMutualFriend: boolean): void {
    const senderSafeguards = this.safeguardsMap.get(senderId);
    const recipientSafeguards = this.safeguardsMap.get(recipientId);

    const requiresMutual =
      senderSafeguards?.restrictedDirectMessages || recipientSafeguards?.restrictedDirectMessages;

    if (requiresMutual && !isMutualFriend) {
      throw new ForbiddenException({
        code: 'FAMILY_SAFEGUARD_DMS_BLOCKED',
        message: 'Family Center restricts direct messages from users outside of mutual friends.',
      });
    }
  }

  assertCanSpend(childId: string, amount: number): void {
    const safeguards = this.getSafeguards(childId);
    if (safeguards.monthlyBudget > 0) {
      if (safeguards.spentThisMonth + amount > safeguards.monthlyBudget) {
        throw new ForbiddenException({
          code: 'FAMILY_SPENDING_LIMIT_EXCEEDED',
          message: `Purchase amount exceeds the monthly spending limit ($${safeguards.monthlyBudget}).`,
        });
      }
    }
  }
}
