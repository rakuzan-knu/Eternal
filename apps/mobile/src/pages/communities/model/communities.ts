import type {
  CommunityCategoryDto,
  CommunityChannelDto,
  CommunityRole,
} from '@social-network/shared-contracts';
import { plural, tr } from '@/shared/lib/i18n';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function inviteTokenFromInput(input: string): string | null {
  const value = input.trim();
  if (TOKEN.test(value)) return value;
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'eternal:'].includes(url.protocol)) return null;
    const pathname = url.protocol === 'eternal:' ? `/${url.host}${url.pathname}` : url.pathname;
    return pathname.match(/^\/invite\/([A-Za-z0-9_-]{43})\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export interface ChannelGroup {
  id: string;
  name: string | null;
  channels: CommunityChannelDto[];
}

export function groupChannels(
  channels: CommunityChannelDto[],
  categories: CommunityCategoryDto[] = [],
): ChannelGroup[] {
  const active = channels
    .filter((channel) => !channel.archivedAt)
    .sort((a, b) => a.position - b.position);
  const known = new Set(categories.map((category) => category.id));
  const loose = active.filter((channel) => !channel.categoryId || !known.has(channel.categoryId));
  const groups: ChannelGroup[] = loose.length
    ? [{ id: 'uncategorized', name: null, channels: loose }]
    : [];
  for (const category of [...categories].sort((a, b) => a.position - b.position)) {
    const items = active.filter((channel) => channel.categoryId === category.id);
    if (items.length) groups.push({ id: category.id, name: category.name, channels: items });
  }
  return groups;
}

export function filterChannels(groups: ChannelGroup[], query: string): ChannelGroup[] {
  const term = query.trim().toLowerCase();
  if (!term) return groups;
  return groups
    .map((group) => ({
      ...group,
      channels: group.channels.filter(
        (channel) =>
          channel.name.toLowerCase().includes(term) ||
          channel.description.toLowerCase().includes(term),
      ),
    }))
    .filter((group) => group.channels.length > 0);
}

export function canInvite(role: CommunityRole | undefined) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function roleLabel(role: CommunityRole) {
  return role === 'OWNER' ? tr('Owner') : role === 'ADMIN' ? tr('Admin') : tr('Member');
}

export function memberCountLabel(count: number) {
  return plural(count, { one: '{count} member', other: '{count} members' });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.trim().slice(0, 2)
  ).toUpperCase();
}

export function expiryLabel(expiresAt: string, now = Date.now()) {
  const days = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000));
  return days <= 1 ? tr('Expires within a day') : tr('Expires in {count} days', { count: days });
}

export const INVITE_EXPIRY_OPTIONS = ['1 day', '7 days', '30 days'] as const;
export type InviteExpiryOption = (typeof INVITE_EXPIRY_OPTIONS)[number];
export const expiryDays = (option: InviteExpiryOption) => Number.parseInt(option, 10);

export function parseMaxUses(value: string): { value?: number; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000)
    return { error: tr('Enter a whole number from 1 to 10,000, or leave it empty.') };
  return { value: parsed };
}
