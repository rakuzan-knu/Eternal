import { z } from 'zod';
import type { ConversationView } from './chat';

const ids = z.preprocess(
  (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
  z.array(z.string().min(1).max(128)).max(1000).default([]),
);

/** Snapshot-stable activity order, with a 15 minute traversal lifetime. */
export const conversationPageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  cursor: z.string().max(2048).optional(),
  search: z.string().trim().max(120).default(''),
  archive: z.enum(['active', 'archived', 'all']).default('active'),
  filter: z.enum(['ALL', 'PERSONAL', 'GROUPS', 'UNREAD', 'CUSTOM', 'EMPTY']).default('ALL'),
  folderId: z.string().uuid().optional(),
  includeIds: ids,
  excludeIds: ids,
  forcedUnreadIds: ids,
  locallyReadIds: ids,
});
export type ConversationPageQuery = z.infer<typeof conversationPageQuerySchema>;
export interface ConversationPage {
  data: Array<ConversationView & { participantCount: number; hasMoreParticipants: boolean }>;
  nextCursor: string | null;
  hasMore: boolean;
  order: 'activityAt';
}
