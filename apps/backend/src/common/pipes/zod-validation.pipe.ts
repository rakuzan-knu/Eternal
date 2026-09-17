import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function checkPrototypePollution(obj: unknown, seen = new WeakSet<object>()): void {
  if (obj === null || typeof obj !== 'object') {
    return;
  }

  if (seen.has(obj)) {
    return;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      checkPrototypePollution(obj[i], seen);
    }
    return;
  }

  const keys = Object.getOwnPropertyNames(obj);
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new BadRequestException(`Forbidden property '${key}' detected in request payload.`);
    }
    checkPrototypePollution((obj as Record<string, unknown>)[key], seen);
  }
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    checkPrototypePollution(value);

    try {
      const parsed: unknown = this.schema.parse(value);
      checkPrototypePollution(parsed);
      return parsed;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).message);
      }
      throw error;
    }
  }
}
