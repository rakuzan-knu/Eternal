import { type MessageKey, msg, tr } from '@/shared/lib/i18n';

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  family: 'developer' | 'beta' | 'early' | 'moderator' | 'premium' | 'contributor' | 'partner';
}

const BASE = {
  DEVELOPER: {
    name: msg('Developer'),
    description: msg('One of the platform developers'),
    family: 'developer',
  },
  BETA_TESTER: {
    name: msg('Beta tester'),
    description: msg('Took part in the platform beta'),
    family: 'beta',
  },
  EARLY_SUPPORTER: {
    name: msg('Early supporter'),
    description: msg('Supported the project at an early stage'),
    family: 'early',
  },
  MODERATOR: {
    name: msg('Moderator'),
    description: msg('Keeps the platform safe'),
    family: 'moderator',
  },
  PREMIUM: {
    name: msg('Premium'),
    description: msg('Active Premium subscription'),
    family: 'premium',
  },
  CONTRIBUTOR: {
    name: msg('Contributor'),
    description: msg('Made significant contributions to the platform'),
    family: 'contributor',
  },
  PARTNER: { name: msg('Partner'), description: msg('Official partner'), family: 'partner' },
} satisfies Record<
  string,
  { name: MessageKey; description: MessageKey; family: BadgeInfo['family'] }
>;

const isBase = (id: string): id is keyof typeof BASE => id in BASE;

const TIERS = ['OPAL', 'RUBY', 'DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const;

const TIER_NAMES = {
  OPAL: msg('Opal'),
  RUBY: msg('Ruby'),
  DIAMOND: msg('Diamond'),
  PLATINUM: msg('Platinum'),
  GOLD: msg('Gold'),
  SILVER: msg('Silver'),
  BRONZE: msg('Bronze'),
} satisfies Record<(typeof TIERS)[number], MessageKey>;

const isTier = (tier: string): tier is keyof typeof TIER_NAMES => tier in TIER_NAMES;

const localize = (id: string, base: (typeof BASE)[keyof typeof BASE]): BadgeInfo => ({
  id,
  family: base.family,
  name: tr(base.name),
  description: tr(base.description),
});

export function badgeInfo(id: string): BadgeInfo | null {
  const upper = id.toUpperCase();
  if (isBase(upper)) return localize(id, BASE[upper]);
  for (const family of ['CONTRIBUTOR', 'PREMIUM'] as const) {
    if (!upper.startsWith(`${family}_`)) continue;
    const tier = upper.slice(family.length + 1);
    const base = BASE[family];
    if (!isTier(tier)) return localize(id, base);
    return {
      ...localize(id, base),
      name:
        family === 'CONTRIBUTOR'
          ? tr('{tier} contributor', { tier: tr(TIER_NAMES[tier]) })
          : tr('{tier} premium', { tier: tr(TIER_NAMES[tier]) }),
    };
  }
  return null;
}

export function ownedBadges(ids: readonly string[]) {
  const upper = ids.map((id) => id.toUpperCase());
  const best = (family: 'CONTRIBUTOR' | 'PREMIUM') =>
    TIERS.map((tier) => `${family}_${tier}`).find((id) => upper.includes(id)) ?? family;
  const seen = new Set<string>();
  const result: BadgeInfo[] = [];
  for (const id of upper) {
    const family = id.startsWith('CONTRIBUTOR')
      ? 'CONTRIBUTOR'
      : id.startsWith('PREMIUM')
        ? 'PREMIUM'
        : null;
    const key = family ?? id;
    if (seen.has(key)) continue;
    seen.add(key);
    const target = family ? best(family) : id;
    const info = badgeInfo(ids[upper.indexOf(target)] ?? target);
    if (info) result.push(info);
  }
  return result;
}
