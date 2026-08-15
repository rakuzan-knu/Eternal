import { z } from 'zod';

export const healthServicesStatusSchema = z.object({
  database: z.enum(['ok', 'error']),
  redis: z.enum(['ok', 'error']),
});

export class HealthServicesStatusDto {
  database!: 'ok' | 'error';
  redis!: 'ok' | 'error';
}

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string(),
  uptime: z.number(),
  services: healthServicesStatusSchema,
});

export class HealthResponseDto {
  status!: 'ok' | 'degraded' | 'error';
  timestamp!: string;
  uptime!: number;
  services!: HealthServicesStatusDto;
}

export const pingResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
});

export class PingResponseDto {
  status!: string;
  timestamp!: string;
}
