import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  QueryComplexityService,
  DEFAULT_MAX_QUERY_DEPTH,
  DEFAULT_MAX_QUERY_COMPLEXITY,
  type ComplexityOptions,
} from './query-complexity.service';
import { QUERY_COMPLEXITY_KEY } from './query-complexity.decorator';
import type { Request } from 'express';

@Injectable()
export class QueryComplexityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly complexityService: QueryComplexityService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const options = this.reflector.getAllAndOverride<ComplexityOptions | undefined>(
      QUERY_COMPLEXITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    const maxDepth = options?.maxDepth ?? DEFAULT_MAX_QUERY_DEPTH;
    const maxComplexity = options?.maxComplexity ?? DEFAULT_MAX_QUERY_COMPLEXITY;

    const req = context.switchToHttp().getRequest<Request>();

    // 1. Validate Query Parameters
    if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
      this.complexityService.validatePayload(req.query, maxDepth, maxComplexity);
    }

    // 2. Validate Request Body
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body: Record<string, unknown> = req.body;
    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      this.complexityService.validatePayload(body, maxDepth, maxComplexity);
    }

    // 3. Validate URL Params
    if (req.params && typeof req.params === 'object' && Object.keys(req.params).length > 0) {
      this.complexityService.validatePayload(req.params, maxDepth, maxComplexity);
    }

    return true;
  }
}
