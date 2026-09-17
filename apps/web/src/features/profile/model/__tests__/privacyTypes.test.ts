import { describe, it, expect } from 'vitest';
import { DIMENSION_TO_KEY } from '../privacyTypes';

describe('privacyTypes', () => {
  it('maps all privacy dimensions to corresponding visibility settings keys', () => {
    expect(DIMENSION_TO_KEY.LAST_SEEN).toBe('lastSeen');
    expect(DIMENSION_TO_KEY.AVATAR).toBe('avatar');
    expect(DIMENSION_TO_KEY.BANNER).toBe('banner');
    expect(DIMENSION_TO_KEY.FORWARD_LINK).toBe('forwardLink');
    expect(DIMENSION_TO_KEY.CALLS).toBe('calls');
    expect(DIMENSION_TO_KEY.VOICE_MESSAGES).toBe('voiceMessages');
    expect(DIMENSION_TO_KEY.MESSAGES).toBe('messages');
    expect(DIMENSION_TO_KEY.BIRTHDAY).toBe('birthday');
    expect(DIMENSION_TO_KEY.BIO).toBe('bio');
    expect(DIMENSION_TO_KEY.GROUP_INVITES).toBe('groupInvites');
  });
});
