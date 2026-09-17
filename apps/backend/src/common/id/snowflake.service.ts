import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import * as os from 'node:os';

export class ClockMovedBackwardsError extends Error {
  constructor(
    public readonly driftMs: bigint,
    public readonly currentTimestamp: bigint,
    public readonly lastTimestamp: bigint,
  ) {
    super(
      `Clock moved backwards by ${driftMs}ms (current: ${currentTimestamp}, last: ${lastTimestamp}). Refusing to generate Snowflake ID.`,
    );
    this.name = 'ClockMovedBackwardsError';
  }
}

/**
 * 64-bit Twitter Snowflake ID Generator:
 *
 * 1 bit  : unused sign bit (always 0)
 * 41 bits: timestamp in milliseconds since custom epoch (gives ~69.7 years of life)
 * 10 bits: worker / machine ID (0..1023)
 * 12 bits: sequence counter (0..4095 per millisecond per worker)
 *
 * Guarantees strictly chronological (k-sorted) ordering directly at the ID level.
 */
@Injectable()
export class SnowflakeService {
  private readonly logger = new Logger(SnowflakeService.name);

  // Custom Epoch: 2024-01-01T00:00:00.000Z
  private static readonly DEFAULT_EPOCH = 1704067200000n;

  private static readonly WORKER_ID_BITS = 10n;
  private static readonly SEQUENCE_BITS = 12n;

  private static readonly MAX_WORKER_ID = (1n << SnowflakeService.WORKER_ID_BITS) - 1n; // 1023
  private static readonly SEQUENCE_MASK = (1n << SnowflakeService.SEQUENCE_BITS) - 1n; // 4095

  private static readonly WORKER_ID_SHIFT = SnowflakeService.SEQUENCE_BITS; // 12
  private static readonly TIMESTAMP_LEFT_SHIFT =
    SnowflakeService.SEQUENCE_BITS + SnowflakeService.WORKER_ID_BITS; // 22

  private readonly epoch: bigint;
  private readonly workerId: bigint;

  private sequence = 0n;
  private lastTimestamp = -1n;

  constructor(private readonly configService?: ConfigService) {
    const customEpochMs = this.configService?.get<number>('SNOWFLAKE_EPOCH');
    this.epoch = customEpochMs ? BigInt(customEpochMs) : SnowflakeService.DEFAULT_EPOCH;

    const envWorkerId = this.configService?.get<number | string>('WORKER_ID');
    if (envWorkerId !== undefined && envWorkerId !== null && !isNaN(Number(envWorkerId))) {
      this.workerId = BigInt(Number(envWorkerId)) & SnowflakeService.MAX_WORKER_ID;
    } else {
      this.workerId = this.generateWorkerIdFromEnvironment();
    }
  }

  /**
   * Derives a deterministic 10-bit worker ID from host name, process ID, or MAC address.
   */
  private generateWorkerIdFromEnvironment(): bigint {
    try {
      const hostname = os.hostname() || 'localhost';
      const pid = process.pid || 1;
      const hash = createHash('md5').update(`${hostname}:${pid}`).digest('hex');
      const numeric = parseInt(hash.slice(0, 4), 16);
      return BigInt(numeric) & SnowflakeService.MAX_WORKER_ID;
    } catch {
      return BigInt(Math.floor(Math.random() * 1024)) & SnowflakeService.MAX_WORKER_ID;
    }
  }

  private getCurrentTimestamp(): bigint {
    return BigInt(Date.now());
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.getCurrentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.getCurrentTimestamp();
    }
    return timestamp;
  }

  /**
   * Generates a 64-bit monotonic Snowflake ID formatted as a decimal string.
   */
  generate(): string {
    let timestamp = this.getCurrentTimestamp();

    if (timestamp < this.lastTimestamp) {
      const drift = this.lastTimestamp - timestamp;
      if (drift <= 5n) {
        // Spin-wait for brief NTP clock adjustments
        timestamp = this.waitNextMillis(this.lastTimestamp);
      } else {
        this.logger.error(
          `Clock moved backwards by ${drift}ms. System clock regression exceeds safety threshold (5ms). Refusing to generate ID.`,
        );
        throw new ClockMovedBackwardsError(drift, timestamp, this.lastTimestamp);
      }
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & SnowflakeService.SEQUENCE_MASK;
      if (this.sequence === 0n) {
        // Sequence overflow in the current millisecond: wait for next millisecond
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const timeDelta = timestamp - this.epoch;
    const id =
      (timeDelta << SnowflakeService.TIMESTAMP_LEFT_SHIFT) |
      (this.workerId << SnowflakeService.WORKER_ID_SHIFT) |
      this.sequence;

    return id.toString();
  }

  /**
   * Parses a Snowflake ID into its components (Timestamp, Worker ID, Sequence).
   */
  parse(id: string): { timestamp: Date; workerId: number; sequence: number } {
    const raw = BigInt(id);
    const sequence = Number(raw & SnowflakeService.SEQUENCE_MASK);
    const workerId = Number(
      (raw >> SnowflakeService.WORKER_ID_SHIFT) & SnowflakeService.MAX_WORKER_ID,
    );
    const timeDelta = raw >> SnowflakeService.TIMESTAMP_LEFT_SHIFT;
    const timestampMs = Number(timeDelta + this.epoch);

    return {
      timestamp: new Date(timestampMs),
      workerId,
      sequence,
    };
  }

  /**
   * Extracts the creation Date timestamp from a Snowflake ID.
   */
  extractTimestamp(id: string): Date {
    return this.parse(id).timestamp;
  }

  /**
   * Checks whether a given string is a valid Snowflake ID format.
   */
  isValid(id: string): boolean {
    if (!id || typeof id !== 'string' || !/^\d{1,20}$/.test(id)) {
      return false;
    }
    try {
      const parsed = BigInt(id);
      return parsed > 0n;
    } catch {
      return false;
    }
  }

  /**
   * Compares two Snowflake IDs chronologically (-1 if idA < idB, 1 if idA > idB, 0 if equal).
   */
  compare(idA: string, idB: string): number {
    const a = BigInt(idA);
    const b = BigInt(idB);
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
}
