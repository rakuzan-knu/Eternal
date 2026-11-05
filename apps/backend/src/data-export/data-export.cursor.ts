import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { DataExportSection, DataExportServiceRole } from '@common/contracts';

const cursorSchema = z
  .object({
    userId: z.string().min(1).max(128),
    service: z.enum(['core', 'messenger']),
    section: z.enum(['posts', 'comments', 'messages']),
    snapshot: z.string().datetime(),
    lastCreatedAt: z.string().datetime(),
    lastId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();

export interface ExportPosition {
  snapshot: Date;
  after?: { createdAt: Date; id: string };
}

@Injectable()
export class DataExportCursor {
  constructor(private readonly config: ConfigService) {}

  private signature(payload: string): Buffer {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new ServiceUnavailableException('Data export is not configured');
    return createHmac('sha256', secret).update('eternal-data-export:v1:').update(payload).digest();
  }

  encode(
    userId: string,
    service: DataExportServiceRole,
    section: DataExportSection,
    snapshot: Date,
    last: { createdAt: Date; id: string },
  ): string {
    const payload = Buffer.from(
      JSON.stringify({
        userId,
        service,
        section,
        snapshot: snapshot.toISOString(),
        lastCreatedAt: last.createdAt.toISOString(),
        lastId: last.id,
      }),
    ).toString('base64url');
    return `${payload}.${this.signature(payload).toString('base64url')}`;
  }

  decode(
    cursor: string | undefined,
    userId: string,
    service: DataExportServiceRole,
    section: DataExportSection,
    now = new Date(),
  ): ExportPosition {
    if (!cursor) return { snapshot: now };
    const parts = cursor.split('.');
    const payload = parts[0];
    const signature = parts[1];
    if (
      parts.length !== 2 ||
      !payload ||
      !signature ||
      !/^[A-Za-z0-9_-]+$/.test(payload) ||
      !/^[A-Za-z0-9_-]{43}$/.test(signature)
    )
      throw new BadRequestException('Invalid or expired export cursor');
    const expected = this.signature(payload);
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new BadRequestException('Invalid or expired export cursor');
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid or expired export cursor');
    }
    const parsed = cursorSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('Invalid or expired export cursor');
    const data = parsed.data;
    const snapshot = new Date(data.snapshot);
    const lastCreatedAt = new Date(data.lastCreatedAt);
    if (
      data.userId !== userId ||
      data.service !== service ||
      data.section !== section ||
      snapshot.getTime() > now.getTime() ||
      now.getTime() - snapshot.getTime() > 60 * 60_000 ||
      lastCreatedAt.getTime() > snapshot.getTime()
    )
      throw new BadRequestException('Invalid or expired export cursor');
    return { snapshot, after: { createdAt: lastCreatedAt, id: data.lastId } };
  }
}
