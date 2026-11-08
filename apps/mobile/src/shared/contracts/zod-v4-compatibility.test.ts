import { describe, expect, it } from 'vitest';
import * as shared from '@social-network/shared-contracts';

describe('shared Zod compatibility', () => {
  it('preserves omitted unknown call fields', () => {
    const payload = { callId: 'example' };
    expect(shared.iceCandidateSchema.parse(payload)).toEqual(payload);
    expect(shared.callReconnectAnswerSchema.parse(payload)).toEqual(payload);
    expect(shared.iceRestartAnswerSchema.parse(payload)).toEqual(payload);
    expect(shared.iceCandidateSchema.parse({ ...payload, candidate: null }).candidate).toBeNull();
  });

  it('preserves UUID-like identifiers accepted before migration', () => {
    const conversationId = 'c1111111-1111-1111-1111-111111111111';
    expect(shared.conversationIdSchema.parse({ conversationId })).toEqual({ conversationId });
    expect(shared.conversationIdSchema.safeParse({ conversationId: 'invalid' }).success).toBe(
      false,
    );
  });

  it('leaves omitted optional feed and reel fields absent', () => {
    expect(shared.getPostsQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(shared.getCompactFeedQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(shared.createReelSchema.parse({})).toEqual({});
    expect(shared.getPostsQuerySchema.parse({ algorithm: 'ml' }).algorithm).toBe('ml');
    expect(shared.createReelSchema.parse({ caption: 'hello' }).caption).toBe('hello');
  });

  it('only includes supplied fields in partial updates', () => {
    expect(shared.updateFeatureFlagSchema.parse({})).toEqual({});
    expect(shared.updateFeatureFlagSchema.parse({ description: 'changed' })).toEqual({
      description: 'changed',
    });
    expect(shared.updateNotificationSettingsSchema.parse({})).toEqual({});
    expect(shared.updateNotificationSettingsSchema.parse({ volume: 0 })).toEqual({ volume: 0 });
    expect(shared.updateFolderSchema.parse({})).toEqual({});
    expect(shared.updateFolderSchema.parse({ name: 'changed' })).toEqual({ name: 'changed' });
  });

  it('retains defaults for creation and full notification settings', () => {
    expect(shared.createFeatureFlagSchema.parse({ key: 'example' })).toMatchObject({
      isEnabled: false,
      rolloutPercentage: 0,
      targetUserIds: [],
      targetRoles: [],
    });
    expect(shared.createFolderSchema.parse({ name: 'Example' })).toMatchObject({
      color: '#8b5cf6',
      filterType: 'CUSTOM',
      includeIds: [],
      excludeIds: [],
    });
    expect(shared.notificationSettingsSchema.parse({})).toMatchObject({
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
    expect(shared.dataExportPageSchema.parse(page)).toEqual(page);
    expect(shared.selfHealResponseSchema.shape.evictedPatterns.parse({ 'cache:*': 2 })).toEqual({
      'cache:*': 2,
    });
    expect(
      shared.selfHealResponseSchema.shape.evictedPatterns.safeParse({ bad: '2' }).success,
    ).toBe(false);
  });
});

describe('shared authentication field errors', () => {
  const fields = [
    [shared.loginSchema.shape.identity, 'Please enter your email or mobile phone number'],
    [shared.loginSchema.shape.password, 'Please enter your password'],
    [shared.forgotPasswordSchema.shape.email, 'Email or mobile phone number is required'],
    [shared.registerFormSchema.shape.firstName, 'Enter first name'],
    [shared.registerFormSchema.shape.lastName, 'Enter last name'],
    [shared.registerFormSchema.shape.username, 'Username is required'],
    [shared.registerFormSchema.shape.identity, 'Mobile number or email is required'],
    [shared.registerFormSchema.shape.password, 'Password is required'],
    [shared.registerFormSchema.shape.confirmPassword, 'Please confirm your password'],
  ] as const;

  it.each(fields)('preserves the missing field message %#', (schema, message) => {
    const result = schema.safeParse(undefined);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe(message);
  });

  it.each(fields)('rejects wrong types without a missing field message %#', (schema, message) => {
    for (const input of [null, 42, false, [], {}]) {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_type');
        expect(result.error.issues[0]?.message).not.toBe(message);
      }
    }
  });
});
