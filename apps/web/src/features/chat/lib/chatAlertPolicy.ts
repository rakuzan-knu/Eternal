import type { ConversationView } from '@/entities/chat';

type AlertPreferences = Pick<
  ConversationView,
  | 'myNotificationMode'
  | 'myEffectiveNotificationMode'
  | 'myNotificationMutedUntil'
  | 'myMuteLevel'
  | 'myMutedUntil'
  | 'blockedByMe'
  | 'blockingMe'
  | 'isBlocked'
>;

/** Alert preferences never affect message delivery, history or unread counts. */
export function allowsChatAlert(
  conversation: AlertPreferences | undefined,
  userId: string | null,
  mentionedUserIds: readonly string[] | undefined,
  kind: 'message' | 'reaction' = 'message',
  now = Date.now(),
): boolean {
  if (
    !conversation ||
    conversation.blockedByMe ||
    conversation.blockingMe ||
    conversation.isBlocked
  )
    return false;
  const mutedUntil = conversation.myNotificationMutedUntil;
  if (mutedUntil && Date.parse(mutedUntil) > now) return false;
  const legacyMuted =
    conversation.myMuteLevel === 'MESSAGES' || conversation.myMuteLevel === 'MESSAGES_AND_CALLS';
  if (
    legacyMuted &&
    (!conversation.myMutedUntil || !(Date.parse(conversation.myMutedUntil) <= now))
  )
    return false;
  const mode = conversation.myEffectiveNotificationMode ?? conversation.myNotificationMode ?? 'ALL';
  return (
    mode === 'ALL' ||
    (mode === 'MENTIONS' &&
      kind === 'message' &&
      Boolean(userId && mentionedUserIds?.includes(userId)))
  );
}
