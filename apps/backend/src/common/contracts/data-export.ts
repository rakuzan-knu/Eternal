import { z } from 'zod';

export const CORE_DATA_EXPORT_SECTIONS = [
  'account',
  'profile',
  'settings',
  'posts',
  'comments',
] as const;
export const MESSENGER_DATA_EXPORT_SECTIONS = ['messages'] as const;

const exportRequestFields = {
  password: z.string().min(1).max(256),
  cursor: z.string().min(1).max(2048).optional(),
  limit: z.number().int().min(1).max(100).default(50),
};

export const coreDataExportRequestSchema = z
  .object({ ...exportRequestFields, section: z.enum(CORE_DATA_EXPORT_SECTIONS) })
  .strict();

export const messengerDataExportRequestSchema = z
  .object({ ...exportRequestFields, section: z.enum(MESSENGER_DATA_EXPORT_SECTIONS) })
  .strict();

export const dataExportPageSchema = z
  .object({
    schemaVersion: z.literal(1),
    service: z.enum(['core', 'messenger']),
    section: z.enum([...CORE_DATA_EXPORT_SECTIONS, ...MESSENGER_DATA_EXPORT_SECTIONS]),
    exportedAt: z.string().datetime(),
    items: z.array(z.record(z.unknown())).max(100),
    nextCursor: z.string().max(2048).nullable(),
    limitations: z.array(z.string()),
  })
  .strict();

export type CoreDataExportRequest = z.infer<typeof coreDataExportRequestSchema>;
export type MessengerDataExportRequest = z.infer<typeof messengerDataExportRequestSchema>;
export type DataExportRequest = CoreDataExportRequest | MessengerDataExportRequest;
export type DataExportPage = z.infer<typeof dataExportPageSchema>;
export type DataExportServiceRole = DataExportPage['service'];
export type DataExportSection = DataExportRequest['section'];
