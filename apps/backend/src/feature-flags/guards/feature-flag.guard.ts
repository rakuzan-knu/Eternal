import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../feature-flags.service';

export const FEATURE_FLAG_KEY = 'FEATURE_FLAG_KEY';

/**
 * Decorator to enforce that a feature flag must be enabled for the request.
 */
export const RequireFeatureFlag = (flagKey: string) => SetMetadata(FEATURE_FLAG_KEY, flagKey);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.getAllAndOverride<string | undefined>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!flagKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id;

    const evaluation = await this.featureFlagsService.evaluateFlag(flagKey, userId);

    if (!evaluation.enabled) {
      throw new ForbiddenException(`Feature "${flagKey}" is currently unavailable.`);
    }

    return true;
  }
}
