import type { ParticipantView } from '@/entities/chat';

/** Resolve typed usernames only against the participants available to this composer. */
export function resolveMessageMentions(
  text: string,
  participants: readonly Pick<ParticipantView, 'userId' | 'user'>[],
  senderId: string | null,
): string[] {
  if (!text.includes('@')) return [];
  const usernames = new Map(
    participants
      .filter((participant) => participant.userId !== senderId && participant.user?.username)
      .map((participant) => [participant.user.username.toLowerCase(), participant.userId]),
  );
  const ids = new Set<string>();
  // Usernames use ASCII letters, digits, periods and underscores and are case-insensitive.
  // Consume the complete token so @alice.other cannot mention @alice accidentally.
  for (const match of text.matchAll(
    /(?:^|[^\p{L}\p{N}_.@])@([a-zA-Z0-9._]+)(?![\p{L}\p{N}_.@])/gu,
  )) {
    const id = usernames.get(match[1].replace(/\.+$/, '').toLowerCase());
    if (id) ids.add(id);
    if (ids.size === 50) break;
  }
  return [...ids];
}
