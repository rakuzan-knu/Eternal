import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).message);
      }
      throw error;
    }
  }
}
