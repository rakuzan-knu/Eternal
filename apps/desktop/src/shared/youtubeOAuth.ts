import { z } from 'zod';

export const youtubeTransactionSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const youtubeConnectArgumentsSchema = z.tuple([
  z.string().min(1).max(4096),
  youtubeTransactionSchema,
]);
export const youtubeCancelArgumentsSchema = z.tuple([youtubeTransactionSchema]);
export const youtubeResultSchema = youtubeTransactionSchema.nullable();
