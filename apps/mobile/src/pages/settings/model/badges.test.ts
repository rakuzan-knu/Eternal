import { expect, it } from 'vitest';
import { badgeInfo, ownedBadges } from './badges';

it('names tiered badges and keeps only the best tier per family', () => {
  expect(badgeInfo('CONTRIBUTOR_GOLD')?.name).toBe('Gold contributor');
  expect(badgeInfo('unknown')).toBeNull();
  const owned = ownedBadges(['developer', 'CONTRIBUTOR_BRONZE', 'CONTRIBUTOR_GOLD', 'PREMIUM']);
  expect(owned.map((badge) => badge.id)).toEqual(['developer', 'CONTRIBUTOR_GOLD', 'PREMIUM']);
});
