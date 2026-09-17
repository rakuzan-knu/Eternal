import { Injectable, BadRequestException } from '@nestjs/common';

export interface ComplexityOptions {
  maxDepth?: number;
  maxComplexity?: number;
}

export const DEFAULT_MAX_QUERY_DEPTH = 5;
export const DEFAULT_MAX_QUERY_COMPLEXITY = 500;

@Injectable()
export class QueryComplexityService {
  /**
   * Calculates the maximum nesting depth of an object, array, or dynamic query.
   */
  calculateDepth(value: unknown, currentDepth = 0, visited = new WeakSet<object>()): number {
    if (value === null || typeof value !== 'object') {
      return currentDepth;
    }

    if (visited.has(value)) {
      return currentDepth;
    }

    visited.add(value);

    let maxChildDepth = currentDepth + 1;

    if (Array.isArray(value)) {
      for (const item of value) {
        const itemDepth = this.calculateDepth(item, currentDepth + 1, visited);
        if (itemDepth > maxChildDepth) {
          maxChildDepth = itemDepth;
        }
      }
    } else {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record);
      for (const key of keys) {
        const childVal = record[key];
        const childDepth = this.calculateDepth(childVal, currentDepth + 1, visited);
        if (childDepth > maxChildDepth) {
          maxChildDepth = childDepth;
        }
      }
    }

    visited.delete(value);
    return maxChildDepth;
  }

  /**
   * Calculates a structural complexity score for the given payload or query tree.
   */
  calculateComplexity(value: unknown, depth = 1, visited = new WeakSet<object>()): number {
    if (value === null || value === undefined) {
      return 1;
    }

    if (typeof value !== 'object') {
      if (typeof value === 'string') {
        return 1 + Math.floor(value.length / 500);
      }
      return 1;
    }

    if (visited.has(value)) {
      return 1;
    }

    visited.add(value);

    let score = 1;
    const depthWeight = Math.max(1, depth * 0.5);

    if (Array.isArray(value)) {
      score += value.length * depthWeight;
      for (const item of value.slice(0, 50)) {
        score += this.calculateComplexity(item, depth + 1, visited);
      }
    } else {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record);
      score += keys.length * depthWeight;

      for (const key of keys) {
        const child = record[key];
        score += this.calculateComplexity(child, depth + 1, visited);
      }
    }

    visited.delete(value);
    return Math.round(score);
  }

  /**
   * Validates both depth and complexity thresholds, throwing standard 400 Bad Request on breach.
   */
  validatePayload(
    payload: unknown,
    maxDepth = DEFAULT_MAX_QUERY_DEPTH,
    maxComplexity = DEFAULT_MAX_QUERY_COMPLEXITY,
  ): void {
    if (payload === null || payload === undefined) {
      return;
    }

    const depth = this.calculateDepth(payload);
    if (depth > maxDepth) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'QUERY_DEPTH_LIMIT_EXCEEDED',
        error: 'BadRequest',
        message: `Query depth of ${depth} exceeds the maximum allowed limit of ${maxDepth}`,
      });
    }

    const complexity = this.calculateComplexity(payload);
    if (complexity > maxComplexity) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'QUERY_COMPLEXITY_LIMIT_EXCEEDED',
        error: 'BadRequest',
        message: `Query complexity score of ${complexity} exceeds the maximum allowed limit of ${maxComplexity}`,
      });
    }
  }
}
