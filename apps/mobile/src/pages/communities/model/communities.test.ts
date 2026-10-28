import { expect, it } from 'vitest';
import type { CommunityChannelDto } from '@social-network/shared-contracts';
import {
  canInvite,
  expiryLabel,
  filterChannels,
  groupChannels,
  initials,
  inviteTokenFromInput,
  memberCountLabel,
  parseMaxUses,
} from './communities';

const token = 'A'.repeat(40) + '_-9';

it('accepts bare tokens and invite links only', () => {
  expect(inviteTokenFromInput(` ${token} `)).toBe(token);
  expect(inviteTokenFromInput(`https://eternal.example/invite/${token}`)).toBe(token);
  expect(inviteTokenFromInput(`https://eternal.example/invite/${token}/`)).toBe(token);
  expect(inviteTokenFromInput(`eternal://invite/${token}`)).toBe(token);
  expect(inviteTokenFromInput(`javascript:alert(1)//invite/${token}`)).toBeNull();
  expect(inviteTokenFromInput(`https://eternal.example/invite/${token}/extra`)).toBeNull();
  expect(inviteTokenFromInput('https://eternal.example/invite/short')).toBeNull();
  expect(inviteTokenFromInput('not a link')).toBeNull();
});

const channel = (id: string, extra: Partial<CommunityChannelDto> = {}) =>
  ({
    id,
    communityId: 'c',
    conversationId: `conv-${id}`,
    name: id,
    description: '',
    position: 0,
    categoryId: null,
    archivedAt: null,
    ...extra,
  }) as CommunityChannelDto;

it('groups active channels by category order and keeps loose channels first', () => {
  const groups = groupChannels(
    [
      channel('voice', { categoryId: 'b', position: 2 }),
      channel('general', { position: 1 }),
      channel('old', { archivedAt: '2024-01-01T00:00:00.000Z' }),
      channel('design', { categoryId: 'a', position: 3 }),
      channel('orphan', { categoryId: 'missing', position: 0 }),
    ],
    [
      { id: 'b', name: 'Voice', position: 2 },
      { id: 'a', name: 'Work', position: 1 },
      { id: 'empty', name: 'Empty', position: 3 },
    ],
  );
  expect(groups.map((group) => [group.name, group.channels.map((item) => item.id)])).toEqual([
    [null, ['orphan', 'general']],
    ['Work', ['design']],
    ['Voice', ['voice']],
  ]);
});

it('filters channels by name or description and drops empty groups', () => {
  const groups = groupChannels([
    channel('general', { description: 'Say hello' }),
    channel('random'),
  ]);
  expect(filterChannels(groups, 'HELLO')[0]?.channels.map((item) => item.id)).toEqual(['general']);
  expect(filterChannels(groups, 'nothing')).toEqual([]);
  expect(filterChannels(groups, '  ')).toBe(groups);
});

it('limits invitations to owners and admins', () => {
  expect(canInvite('OWNER')).toBe(true);
  expect(canInvite('ADMIN')).toBe(true);
  expect(canInvite('MEMBER')).toBe(false);
  expect(canInvite(undefined)).toBe(false);
});

it('formats labels', () => {
  expect(memberCountLabel(1)).toBe('1 member');
  expect(memberCountLabel(12500)).toBe('12,500 members');
  expect(initials('Night Trains Club')).toBe('NT');
  expect(initials('kyiv')).toBe('KY');
  const now = Date.parse('2026-01-01T00:00:00Z');
  expect(expiryLabel('2026-01-01T12:00:00Z', now)).toBe('Expires within a day');
  expect(expiryLabel('2026-01-08T00:00:00Z', now)).toBe('Expires in 7 days');
});

it('validates the optional join limit', () => {
  expect(parseMaxUses('')).toEqual({});
  expect(parseMaxUses('25')).toEqual({ value: 25 });
  expect(parseMaxUses('0').error).toBeDefined();
  expect(parseMaxUses('1.5').error).toBeDefined();
  expect(parseMaxUses('10001').error).toBeDefined();
});
