import { ClockMovedBackwardsError, SnowflakeService } from '../snowflake.service';
import type { ConfigService } from '@nestjs/config';

describe('SnowflakeService', () => {
  let snowflake: SnowflakeService;

  beforeEach(() => {
    snowflake = new SnowflakeService();
  });

  it('should generate valid 64-bit string snowflake IDs', () => {
    const id = snowflake.generate();
    expect(typeof id).toBe('string');
    expect(snowflake.isValid(id)).toBe(true);
  });

  it('should generate strictly monotonically increasing IDs in the same millisecond', () => {
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      ids.push(snowflake.generate());
    }

    for (let i = 1; i < ids.length; i++) {
      const prev = BigInt(ids[i - 1]);
      const curr = BigInt(ids[i]);
      expect(curr > prev).toBe(true);
      expect(snowflake.compare(ids[i - 1], ids[i])).toBe(-1);
    }
  });

  it('should parse Snowflake ID into timestamp, workerId and sequence', () => {
    const before = Date.now();
    const id = snowflake.generate();
    const after = Date.now();

    const parsed = snowflake.parse(id);
    expect(parsed.timestamp.getTime()).toBeGreaterThanOrEqual(before - 10);
    expect(parsed.timestamp.getTime()).toBeLessThanOrEqual(after + 10);
    expect(parsed.workerId).toBeGreaterThanOrEqual(0);
    expect(parsed.workerId).toBeLessThanOrEqual(1023);
    expect(parsed.sequence).toBeGreaterThanOrEqual(0);
    expect(parsed.sequence).toBeLessThanOrEqual(4095);
  });

  it('should extract correct creation timestamp', () => {
    const now = Date.now();
    const id = snowflake.generate();
    const extracted = snowflake.extractTimestamp(id);
    expect(Math.abs(extracted.getTime() - now)).toBeLessThan(100);
  });

  it('should respect custom epoch and worker ID from ConfigService', () => {
    const mockConfig: Partial<ConfigService> = {
      get: jest.fn((key: string) => {
        if (key === 'SNOWFLAKE_EPOCH') return 1600000000000;
        if (key === 'WORKER_ID') return 42;
        return undefined;
      }),
    };

    const customSnowflake = new SnowflakeService(mockConfig as ConfigService);
    const id = customSnowflake.generate();
    const parsed = customSnowflake.parse(id);

    expect(parsed.workerId).toBe(42);
    expect(parsed.timestamp.getTime()).toBeGreaterThan(1600000000000);
  });

  it('should validate invalid strings properly', () => {
    expect(snowflake.isValid('')).toBe(false);
    expect(snowflake.isValid('abc')).toBe(false);
    expect(snowflake.isValid('-123')).toBe(false);
    expect(snowflake.isValid('0')).toBe(false);
  });

  it('should handle small backward clock drift (<= 5ms) by waiting for next millis', () => {
    const originalNow = Date.now;
    let time = 1710000000000;
    jest.spyOn(Date, 'now').mockImplementation(() => time);

    snowflake.generate();

    // Small clock drift backwards by 3ms
    time -= 3;
    // Next time read in waitNextMillis will return caught up time
    let spinCount = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      spinCount++;
      return spinCount >= 2 ? 1710000000001 : time;
    });

    const secondId = snowflake.generate();
    expect(typeof secondId).toBe('string');
    expect(snowflake.isValid(secondId)).toBe(true);

    Date.now = originalNow;
  });

  it('should throw ClockMovedBackwardsError when backward clock drift exceeds 5ms threshold', () => {
    const originalNow = Date.now;
    try {
      let time = 1710000000000;
      jest.spyOn(Date, 'now').mockImplementation(() => time);

      snowflake.generate();

      // Large clock drift backwards by 100ms
      time -= 100;

      expect(() => snowflake.generate()).toThrow(ClockMovedBackwardsError);
    } finally {
      Date.now = originalNow;
    }
  });
});
