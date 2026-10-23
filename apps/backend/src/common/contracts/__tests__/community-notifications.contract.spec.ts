import * as contracts from '../index';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const id = '123e4567-e89b-12d3-a456-426614174000';

describe('community notification contracts', () => {
  it.each(['chat', 'communities'])('keeps shared and backend %s contracts identical', (name) => {
    expect(readFileSync(resolve(__dirname, `../${name}.ts`), 'utf8')).toBe(
      readFileSync(
        resolve(__dirname, `../../../../../../packages/shared/contracts/src/${name}.ts`),
        'utf8',
      ),
    );
  });

  it('accepts mode updates, server mute clearing, and channel inheritance reset', () => {
    expect(
      contracts.updateCommunityNotificationPreferencesSchema.parse({
        notificationMode: 'MENTIONS',
      }),
    ).toEqual({ notificationMode: 'MENTIONS' });
    expect(
      contracts.updateCommunityNotificationPreferencesSchema.parse({
        notificationMutedUntil: null,
      }),
    ).toEqual({ notificationMutedUntil: null });
    expect(
      contracts.updateCommunityChannelNotificationPreferencesSchema.parse({
        notificationMode: null,
      }),
    ).toEqual({ notificationMode: null });
  });
  it.each([
    {},
    { notificationMode: null },
    { notificationMode: 'EVERYONE' },
    { userId: id, notificationMode: 'ALL' },
    { notificationMutedUntil: 'invalid' },
  ])('rejects invalid personal server preference payloads: %j', (payload) => {
    expect(contracts.updateCommunityNotificationPreferencesSchema.safeParse(payload).success).toBe(
      false,
    );
  });
  it('rejects extra channel ownership, mute and revision fields', () => {
    for (const field of ['userId', 'notificationMutedUntil', 'revision'])
      expect(
        contracts.updateCommunityChannelNotificationPreferencesSchema.safeParse({
          notificationMode: 'ALL',
          [field]: id,
        }).success,
      ).toBe(false);
  });
  it('preserves old message payload compatibility while retaining explicit mention metadata', () => {
    expect(
      contracts.sendMessageSchema.parse({ text: 'old client' }).mentionedUserIds,
    ).toBeUndefined();
    expect(
      contracts.sendMessageSchema.parse({ text: 'opaque envelope', mentionedUserIds: [id] })
        .mentionedUserIds,
    ).toEqual([id]);
    for (const ids of [
      [id, id],
      ['@everyone'],
      ['@role'],
      Array.from(
        { length: 51 },
        (_, index) => `123e4567-e89b-12d3-a456-${String(index).padStart(12, '0')}`,
      ),
    ])
      expect(
        contracts.sendMessageSchema.safeParse({ text: 'text', mentionedUserIds: ids }).success,
      ).toBe(false);
  });
  it('accepts older community channel responses without new preference fields', () => {
    const result = contracts.communityChannelsResponseSchema.parse({
      communityId: id,
      role: 'MEMBER',
      data: [
        { id, communityId: id, conversationId: id, name: 'general', description: '', position: 0 },
      ],
    });
    expect(result.data[0].myNotificationMode).toBeUndefined();
    expect(result.data[0].unreadCount).toBeUndefined();
  });
});
