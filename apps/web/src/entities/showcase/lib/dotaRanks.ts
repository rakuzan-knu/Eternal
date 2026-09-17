/**
 * Dota 2 Rank Medals and Star Progression Engine
 * Maps player MMR / rank tier to official Dotabuff / Panorama rank badges.
 */

export interface DotaRankInfo {
  tierName: string;
  tierNameEn: string;
  tierId: number; // 1: Herald, 2: Guardian, 3: Crusader, 4: Archon, 5: Legend, 6: Ancient, 7: Divine, 8: Immortal
  stars: number; // 0 to 5
  medalIcon: string;
  starIcon: string | null;
  badgeLabel: string;
  mmr: number;
}

const BASE_RANK_URL =
  'https://raw.githubusercontent.com/dotabuff/panorama/master/panorama/images/rank_tier_icons';

export function calculateDotaRank(mmr: number = 6124): DotaRankInfo {
  if (mmr >= 5620) {
    const isTopLeaderboard = mmr >= 8900;
    return {
      tierName: 'Immortal',
      tierNameEn: 'Immortal',
      tierId: 8,
      stars: 0,
      medalIcon: `${BASE_RANK_URL}/rank8_psd.png`,
      starIcon: null,
      badgeLabel: isTopLeaderboard ? 'Immortal (Leaderboard)' : 'Immortal',
      mmr,
    };
  }

  if (mmr >= 4620) {
    const stars = mmr < 4820 ? 1 : mmr < 5020 ? 2 : mmr < 5220 ? 3 : mmr < 5420 ? 4 : 5;
    return {
      tierName: 'Divine',
      tierNameEn: 'Divine',
      tierId: 7,
      stars,
      medalIcon: `${BASE_RANK_URL}/rank7_psd.png`,
      starIcon: null,
      badgeLabel: `Divine ${stars}★`,
      mmr,
    };
  }

  if (mmr >= 3850) {
    const stars = mmr < 4000 ? 1 : mmr < 4150 ? 2 : mmr < 4300 ? 3 : mmr < 4460 ? 4 : 5;
    return {
      tierName: 'Ancient',
      tierNameEn: 'Ancient',
      tierId: 6,
      stars,
      medalIcon: `${BASE_RANK_URL}/rank6_psd.png`,
      starIcon: null,
      badgeLabel: `Ancient ${stars}★`,
      mmr,
    };
  }

  if (mmr >= 3080) {
    const stars = mmr < 3230 ? 1 : mmr < 3390 ? 2 : mmr < 3540 ? 3 : mmr < 3700 ? 4 : 5;
    return {
      tierName: 'Legend',
      tierNameEn: 'Legend',
      tierId: 5,
      stars,
      medalIcon: `${BASE_RANK_URL}/rank5_psd.png`,
      starIcon: null,
      badgeLabel: `Legend ${stars}★`,
      mmr,
    };
  }

  if (mmr >= 2310) {
    const stars = mmr < 2450 ? 1 : mmr < 2610 ? 2 : mmr < 2770 ? 3 : mmr < 2930 ? 4 : 5;
    return {
      tierName: 'Archon',
      tierNameEn: 'Archon',
      tierId: 4,
      stars,
      medalIcon: `${BASE_RANK_URL}/rank4_psd.png`,
      starIcon: null,
      badgeLabel: `Archon ${stars}★`,
      mmr,
    };
  }

  if (mmr >= 1540) {
    const stars = mmr < 1700 ? 1 : mmr < 1850 ? 2 : mmr < 2000 ? 3 : mmr < 2150 ? 4 : 5;
    return {
      tierName: 'Crusader',
      tierNameEn: 'Crusader',
      tierId: 3,
      stars,
      medalIcon: `${BASE_RANK_URL}/rank3_psd.png`,
      starIcon: null,
      badgeLabel: `Crusader ${stars}★`,
      mmr,
    };
  }

  if (mmr >= 770) {
    const stars = mmr < 920 ? 1 : mmr < 1080 ? 2 : mmr < 1230 ? 3 : mmr < 1400 ? 4 : 5;
    return {
      tierName: 'Guardian',
      tierNameEn: 'Guardian',
      tierId: 2,
      stars,
      medalIcon: `${BASE_RANK_URL}/rank2_psd.png`,
      starIcon: null,
      badgeLabel: `Guardian ${stars}★`,
      mmr,
    };
  }

  const stars = mmr < 150 ? 1 : mmr < 300 ? 2 : mmr < 450 ? 3 : mmr < 610 ? 4 : 5;
  return {
    tierName: 'Herald',
    tierNameEn: 'Herald',
    tierId: 1,
    stars,
    medalIcon: `${BASE_RANK_URL}/rank1_psd.png`,
    starIcon: null,
    badgeLabel: `Herald ${stars}★`,
    mmr,
  };
}
