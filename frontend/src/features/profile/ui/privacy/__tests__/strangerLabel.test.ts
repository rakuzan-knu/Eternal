import { describe, it, expect } from 'vitest';
import { strangerLabel } from '../strangerLabel';

describe('strangerLabel', () => {
  it('returns formatted label for LAST_SEEN dimension', () => {
    expect(strangerLabel('LAST_SEEN', 'EVERYBODY')).toBe('All see your exact last activity time.');
    expect(strangerLabel('LAST_SEEN', 'CONTACTS')).toBe(
      'Your subscribers see the exact time, others see only «recently».',
    );
    expect(strangerLabel('LAST_SEEN', 'NOBODY')).toBe('Others see only «recently».');
  });

  it('returns formatted label for CALLS and MESSAGES dimensions', () => {
    expect(strangerLabel('CALLS', 'EVERYBODY')).toBe('You can be called by: all.');
    expect(strangerLabel('MESSAGES', 'CONTACTS')).toBe('Send direct messages: your subscribers.');
    expect(strangerLabel('VOICE_MESSAGES', 'NOBODY')).toBe('Send voice messages: nobody.');
  });
});
