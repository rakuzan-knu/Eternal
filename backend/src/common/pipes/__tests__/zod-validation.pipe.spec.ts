import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const testSchema = z.object({
    username: z
      .string()
      .min(3)
      .transform((v) => v.toLowerCase()),
    age: z.number().int().positive(),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  it('transforms valid payload according to schema', () => {
    const input = { username: 'ALICE', age: 25 };
    const result = pipe.transform(input);

    expect(result).toEqual({ username: 'alice', age: 25 });
  });

  it('throws BadRequestException with descriptive error when schema validation fails', () => {
    const input = { username: 'al', age: -5 };

    expect(() => pipe.transform(input)).toThrow(BadRequestException);
    try {
      pipe.transform(input);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const res = (err as BadRequestException).getResponse();
      expect(res).toBeDefined();
      expect(typeof (res as { message: string }).message).toBe('string');
      expect((res as { message: string }).message).toContain('Validation error');
    }
  });

  it('throws BadRequestException for null or non-object values when object schema expected', () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
    expect(() => pipe.transform('invalid-string')).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });

  it('re-throws non-Zod errors untouched', () => {
    const throwingSchema = {
      parse: () => {
        throw new RangeError('Custom non-zod error');
      },
    } as unknown as z.ZodSchema;

    const customPipe = new ZodValidationPipe(throwingSchema);
    expect(() => customPipe.transform({ foo: 'bar' })).toThrow(RangeError);
  });
});
