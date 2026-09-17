import { describe, it, expect } from 'vitest';
import { BADGE_DICTIONARY, getBadgeById } from '../badges';

describe('badges', () => {
  it('defines the standard BADGE_DICTIONARY with 7 badges', () => {
    expect(BADGE_DICTIONARY).toHaveLength(7);
    const ids = BADGE_DICTIONARY.map((b) => b.id);
    expect(ids).toContain('DEVELOPER');
    expect(ids).toContain('BETA_TESTER');
    expect(ids).toContain('EARLY_SUPPORTER');
    expect(ids).toContain('MODERATOR');
    expect(ids).toContain('PREMIUM');
    expect(ids).toContain('CONTRIBUTOR');
    expect(ids).toContain('PARTNER');
  });

  it('retrieves badge by id case-insensitively', () => {
    const devBadge = getBadgeById('developer');
    expect(devBadge).toBeDefined();
    expect(devBadge?.name).toBe('Developer');

    const modBadge = getBadgeById('MODERATOR');
    expect(modBadge?.name).toBe('Moderator');

    expect(getBadgeById(undefined)).toBeUndefined();
    expect(getBadgeById(null)).toBeUndefined();
    expect(getBadgeById('non_existent')).toBeUndefined();
  });
});
