export interface PremiumTier {
  level: number;
  id: string;
  name: string;
  durationLabel: string;
  monthsRequired: number;
  gradient: string;
  accentColor: string;
  borderColor: string;
  glowColor: string;
}

export interface ContributorTier {
  level: number;
  id: string;
  name: string;
  countRequired: number;
  gradient: string;
  accentColor: string;
  borderColor: string;
  glowColor: string;
}

export const PREMIUM_TIERS: PremiumTier[] = [
  {
    level: 0,
    id: 'SUBSCRIBER',
    name: 'Subscriber',
    durationLabel: '< 1 month',
    monthsRequired: 0,
    gradient: 'from-gray-500 to-gray-700',
    accentColor: '#9ca3af',
    borderColor: '#4b5563',
    glowColor: 'rgba(156,163,175,0.2)',
  },
  {
    level: 1,
    id: 'BRONZE',
    name: 'Bronze',
    durationLabel: '1 month',
    monthsRequired: 1,
    gradient: 'from-amber-700 via-orange-600 to-amber-900',
    accentColor: '#cd7f32',
    borderColor: '#b45309',
    glowColor: 'rgba(205,127,50,0.35)',
  },
  {
    level: 2,
    id: 'SILVER',
    name: 'Silver',
    durationLabel: '3 months',
    monthsRequired: 3,
    gradient: 'from-slate-300 via-gray-400 to-slate-600',
    accentColor: '#e2e8f0',
    borderColor: '#94a3b8',
    glowColor: 'rgba(226,232,240,0.35)',
  },
  {
    level: 3,
    id: 'GOLD',
    name: 'Gold',
    durationLabel: '6 months',
    monthsRequired: 6,
    gradient: 'from-yellow-400 via-amber-500 to-yellow-600',
    accentColor: '#eab308',
    borderColor: '#ca8a04',
    glowColor: 'rgba(234,179,8,0.35)',
  },
  {
    level: 4,
    id: 'PLATINUM',
    name: 'Platinum',
    durationLabel: '1 year',
    monthsRequired: 12,
    gradient: 'from-cyan-400 via-blue-500 to-teal-400',
    accentColor: '#06b6d4',
    borderColor: '#0891b2',
    glowColor: 'rgba(6,182,212,0.35)',
  },
  {
    level: 5,
    id: 'DIAMOND',
    name: 'Diamond',
    durationLabel: '2 years',
    monthsRequired: 24,
    gradient: 'from-purple-400 via-violet-500 to-fuchsia-600',
    accentColor: '#a855f7',
    borderColor: '#9333ea',
    glowColor: 'rgba(168,85,247,0.35)',
  },
  {
    level: 6,
    id: 'RUBY',
    name: 'Ruby',
    durationLabel: '5 years',
    monthsRequired: 60,
    gradient: 'from-rose-500 via-red-600 to-pink-600',
    accentColor: '#f43f5e',
    borderColor: '#e11d48',
    glowColor: 'rgba(244,63,94,0.35)',
  },
  {
    level: 7,
    id: 'OPAL',
    name: 'Opal',
    durationLabel: '6+ years',
    monthsRequired: 72,
    gradient: 'from-cyan-300 via-pink-400 to-purple-400',
    accentColor: '#38bdf8',
    borderColor: '#c084fc',
    glowColor: 'rgba(56,189,248,0.45)',
  },
];

export const CONTRIBUTOR_TIERS: ContributorTier[] = [
  {
    level: 1,
    id: 'BRONZE',
    name: 'Bronze',
    countRequired: 1,
    gradient: 'from-amber-700 via-orange-600 to-amber-900',
    accentColor: '#cd7f32',
    borderColor: '#b45309',
    glowColor: 'rgba(205,127,50,0.35)',
  },
  {
    level: 2,
    id: 'SILVER',
    name: 'Silver',
    countRequired: 3,
    gradient: 'from-slate-300 via-gray-400 to-slate-600',
    accentColor: '#e2e8f0',
    borderColor: '#94a3b8',
    glowColor: 'rgba(226,232,240,0.35)',
  },
  {
    level: 3,
    id: 'GOLD',
    name: 'Gold',
    countRequired: 5,
    gradient: 'from-yellow-400 via-amber-500 to-yellow-600',
    accentColor: '#eab308',
    borderColor: '#ca8a04',
    glowColor: 'rgba(234,179,8,0.35)',
  },
  {
    level: 4,
    id: 'PLATINUM',
    name: 'Platinum',
    countRequired: 10,
    gradient: 'from-cyan-400 via-blue-500 to-teal-400',
    accentColor: '#06b6d4',
    borderColor: '#0891b2',
    glowColor: 'rgba(6,182,212,0.35)',
  },
  {
    level: 5,
    id: 'DIAMOND',
    name: 'Diamond',
    countRequired: 25,
    gradient: 'from-purple-400 via-violet-500 to-fuchsia-600',
    accentColor: '#a855f7',
    borderColor: '#9333ea',
    glowColor: 'rgba(168,85,247,0.35)',
  },
  {
    level: 6,
    id: 'RUBY',
    name: 'Ruby',
    countRequired: 50,
    gradient: 'from-rose-500 via-red-600 to-pink-600',
    accentColor: '#f43f5e',
    borderColor: '#e11d48',
    glowColor: 'rgba(244,63,94,0.35)',
  },
  {
    level: 7,
    id: 'OPAL',
    name: 'Opal',
    countRequired: 100,
    gradient: 'from-cyan-300 via-pink-400 to-purple-400',
    accentColor: '#38bdf8',
    borderColor: '#c084fc',
    glowColor: 'rgba(56,189,248,0.45)',
  },
];

export function getPremiumTierByMonths(months: number): PremiumTier {
  if (months < 1) return PREMIUM_TIERS[0];
  for (let i = PREMIUM_TIERS.length - 1; i >= 1; i--) {
    if (months >= PREMIUM_TIERS[i].monthsRequired) {
      return PREMIUM_TIERS[i];
    }
  }
  return PREMIUM_TIERS[1];
}

export function getContributorTierByCount(count: number): ContributorTier {
  for (let i = CONTRIBUTOR_TIERS.length - 1; i >= 0; i--) {
    if (count >= CONTRIBUTOR_TIERS[i].countRequired) {
      return CONTRIBUTOR_TIERS[i];
    }
  }
  return CONTRIBUTOR_TIERS[0];
}
