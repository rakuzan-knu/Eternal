import { z } from 'zod';

export const uploadPurposeSchema = z.enum([
  'post',
  'story',
  'story-overlay',
  'reel',
  'avatar',
  'banner',
  'comment',
  'chat',
]);
export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;
export const directUploadSchema = z
  .object({
    purpose: uploadPurposeSchema,
    contentType: z
      .string()
      .max(100)
      .transform((value) => value.split(';')[0].trim().toLowerCase()),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(20 * 1024 * 1024),
    filename: z.string().min(1).max(255),
    conversationId: z.string().uuid().optional(),
  })
  .strict();
export type DirectUploadInput = z.infer<typeof directUploadSchema>;
export interface CompletedUpload {
  uploadId: string;
  url: string;
  filename?: string | undefined;
  contentType: string;
  sizeBytes: number;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  duration?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
}
