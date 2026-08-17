import { describe, it, expect } from 'vitest';
import { getPremiumTierByMonths, getContributorTierByCount } from '../badgeTiers';

describe('badgeTiers', () => {
  describe('getPremiumTierByMonths', () => {
    it('returns SUBSCRIBER tier for 0 months', () => {
      const tier = getPremiumTierByMonths(0);
      expect(tier.id).toBe('SUBSCRIBER');
      expect(tier.level).toBe(0);
    });

    it('returns BRONZE tier for 1 month', () => {
      const tier = getPremiumTierByMonths(1);
      expect(tier.id).toBe('BRONZE');
    });

    it('returns DIAMOND tier for 24 months', () => {
      const tier = getPremiumTierByMonths(24);
      expect(tier.id).toBe('DIAMOND');
    });

    it('returns highest matching tier for large months count', () => {
      const tier = getPremiumTierByMonths(72);
      expect(tier.id).toBe('OPAL');
    });
  });

  describe('getContributorTierByCount', () => {
    it('returns lowest tier for count 0', () => {
      const tier = getContributorTierByCount(0);
      expect(tier.id).toBe('BRONZE');
      expect(tier.level).toBe(1);
    });

    it('returns OPAL tier for 100+ PRs', () => {
      const tier = getContributorTierByCount(120);
      expect(tier.id).toBe('OPAL');
      expect(tier.level).toBe(7);
    });
  });
});
