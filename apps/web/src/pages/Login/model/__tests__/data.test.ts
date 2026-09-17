import { describe, it, expect } from 'vitest';
import { MOCK_NOTIFS } from '../data';

describe('Login model data (MOCK_NOTIFS)', () => {
  it('contains expected notification data items', () => {
    expect(MOCK_NOTIFS).toHaveLength(3);
    expect(MOCK_NOTIFS[0].name).toBe('Alex K.');
    expect(MOCK_NOTIFS[1].name).toBe('Sara M.');
    expect(MOCK_NOTIFS[2].name).toBe('Post reached');
  });
});
