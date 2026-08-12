import { MessageView } from '../../../entities/chat/model/types';
import { MediaItem, LinkItem, GroupedSection } from '../model/chatMediaTypes';

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export function extractMediaItems(messages: MessageView[]): MediaItem[] {
  const items: MediaItem[] = [];
  for (const message of messages) {
    for (const attachment of message.attachments) {
      if (attachment.type === 'IMAGE' || attachment.type === 'VIDEO' || attachment.type === 'GIF') {
        items.push({ message, attachment });
      }
    }
  }
  return items.sort(
    (a, b) => new Date(a.message.createdAt).getTime() - new Date(b.message.createdAt).getTime(),
  );
}

export function extractFileItems(messages: MessageView[]): MediaItem[] {
  const items: MediaItem[] = [];
  for (const message of messages) {
    for (const attachment of message.attachments) {
      if (attachment.type === 'FILE' || attachment.type === 'AUDIO') {
        items.push({ message, attachment });
      }
    }
  }
  return items.sort(
    (a, b) => new Date(b.message.createdAt).getTime() - new Date(a.message.createdAt).getTime(),
  );
}

export function extractLinkItems(messages: MessageView[]): LinkItem[] {
  const items: LinkItem[] = [];
  for (const message of messages) {
    if (!message.body) continue;
    const matches = message.body.match(URL_REGEX);
    if (!matches) continue;
    for (const url of matches) {
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        items.push({ message, url, hostname });
      } catch {
        // ignore invalid URLs
      }
    }
  }
  return items.sort(
    (a, b) => new Date(b.message.createdAt).getTime() - new Date(a.message.createdAt).getTime(),
  );
}

export function groupByMonth<T extends { message: MessageView }>(items: T[]): GroupedSection<T>[] {
  const groups: GroupedSection<T>[] = [];
  for (const item of items) {
    const label = monthLabel(item.message.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

const LOGO_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export function colorForHostname(hostname: string): string {
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) hash = hostname.charCodeAt(i) + ((hash << 5) - hash);
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}
