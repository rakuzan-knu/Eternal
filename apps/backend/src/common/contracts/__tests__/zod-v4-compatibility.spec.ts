import * as contracts from '../index';

describe('backend Zod compatibility', () => {
  it('preserves omitted unknown call fields', () => {
    const payload = { callId: 'example' };
    expect(contracts.iceCandidateSchema.parse(payload)).toEqual(payload);
    expect(contracts.callReconnectAnswerSchema.parse(payload)).toEqual(payload);
    expect(contracts.iceRestartAnswerSchema.parse(payload)).toEqual(payload);
    expect(
      contracts.iceCandidateSchema.parse({ ...payload, candidate: null }).candidate,
    ).toBeNull();
  });

  it('preserves UUID-like identifiers accepted before migration', () => {
    const conversationId = 'c1111111-1111-1111-1111-111111111111';
    expect(contracts.conversationIdSchema.parse({ conversationId })).toEqual({ conversationId });
    expect(contracts.conversationIdSchema.safeParse({ conversationId: 'invalid' }).success).toBe(
      false,
    );
  });

  it('leaves omitted optional feed and reel fields absent', () => {
    expect(contracts.getPostsQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(contracts.getCompactFeedQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(contracts.createReelSchema.parse({})).toEqual({});
    expect(contracts.getPostsQuerySchema.parse({ algorithm: 'ml' }).algorithm).toBe('ml');
    expect(contracts.createReelSchema.parse({ caption: 'hello' }).caption).toBe('hello');
  });

  it('only includes supplied fields in partial updates', () => {
    expect(contracts.updateFeatureFlagSchema.parse({})).toEqual({});
    expect(contracts.updateFeatureFlagSchema.parse({ description: 'changed' })).toEqual({
      description: 'changed',
    });
    expect(contracts.updateNotificationSettingsSchema.parse({})).toEqual({});
    expect(contracts.updateNotificationSettingsSchema.parse({ volume: 0 })).toEqual({ volume: 0 });
    expect(contracts.updateFolderSchema.parse({})).toEqual({});
    expect(contracts.updateFolderSchema.parse({ name: 'changed' })).toEqual({ name: 'changed' });
  });

  it('retains defaults for creation and full notification settings', () => {
    expect(contracts.createFeatureFlagSchema.parse({ key: 'example' })).toMatchObject({
      isEnabled: false,
      rolloutPercentage: 0,
      targetUserIds: [],
      targetRoles: [],
    });
    expect(contracts.createFolderSchema.parse({ name: 'Example' })).toMatchObject({
      color: '#8b5cf6',
      filterType: 'CUSTOM',
      includeIds: [],
      excludeIds: [],
    });
    expect(contracts.notificationSettingsSchema.parse({})).toMatchObject({
      enableNotifications: true,
      volume: 100,
      mutedActorIds: [],
    });
  });

  it('accepts arbitrary string keys in export items and numeric health records', () => {
    const page = {
      schemaVersion: 1,
      service: 'core',
      section: 'account',
      exportedAt: '2026-11-08T00:00:00.000Z',
      items: [{ id: 'example', profile: { displayName: 'Example' }, deletedAt: null }],
      nextCursor: null,
      limitations: [],
    };
    expect(contracts.dataExportPageSchema.parse(page)).toEqual(page);
    expect(contracts.selfHealResponseSchema.shape.evictedPatterns.parse({ 'cache:*': 2 })).toEqual({
      'cache:*': 2,
    });
    expect(
      contracts.selfHealResponseSchema.shape.evictedPatterns.safeParse({ bad: '2' }).success,
    ).toBe(false);
  });
});
