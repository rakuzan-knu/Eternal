import React from 'react';
import DeveloperBadge from '../ui/DeveloperBadge';
import BetaTesterBadge from '../ui/BetaTesterBadge';
import EarlySupporterBadge from '../ui/EarlySupporterBadge';
import ModeratorBadge from '../ui/ModeratorBadge';
import PremiumBadge from '../ui/PremiumBadge';
import ContributorBadge from '../ui/ContributorBadge';
import PartnerBadge from '../ui/PartnerBadge';

export type BadgeId =
  | 'DEVELOPER'
  | 'BETA_TESTER'
  | 'EARLY_SUPPORTER'
  | 'MODERATOR'
  | 'PREMIUM'
  | 'CONTRIBUTOR'
  | 'PARTNER';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export const BADGE_DICTIONARY: Badge[] = [
  {
    id: 'DEVELOPER',
    name: 'Developer',
    description: 'One of the platform Developers',
    icon: <DeveloperBadge className="w-6 h-6" />,
  },
  {
    id: 'BETA_TESTER',
    name: 'Beta Tester',
    description: 'Participated in platform Beta-test',
    icon: <BetaTesterBadge className="w-6 h-6" />,
  },
  {
    id: 'EARLY_SUPPORTER',
    name: 'Early Supporter',
    description: 'Supported the project at an early stage',
    icon: <EarlySupporterBadge className="w-6 h-6" />,
  },
  {
    id: 'MODERATOR',
    name: 'Moderator',
    description: 'Maintains order on the platform',
    icon: <ModeratorBadge className="w-6 h-6" />,
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    description: 'Active Premium Subscription',
    icon: <PremiumBadge className="w-6 h-6" />,
  },
  {
    id: 'CONTRIBUTOR',
    name: 'Contributor',
    description: 'Made significant contributions to the platform',
    icon: <ContributorBadge className="w-6 h-6" />,
  },
  {
    id: 'PARTNER',
    name: 'Partner',
    description: 'Official Partner status',
    icon: <PartnerBadge className="w-6 h-6" />,
  },
];

import { CONTRIBUTOR_TIERS, PREMIUM_TIERS } from './badgeTiers';
import ContributorTierBadge from '../ui/ContributorTierBadge';
import PremiumTierBadge from '../ui/PremiumTierBadge';

export function getBadgeById(id?: string | null): Badge | undefined {
  if (!id) return undefined;
  const upper = id.toUpperCase();
  const direct = BADGE_DICTIONARY.find((b) => b.id.toUpperCase() === upper);
  if (direct) return direct;

  if (upper.startsWith('CONTRIBUTOR')) {
    const tierName = upper.replace('CONTRIBUTOR_', '');
    const tier = CONTRIBUTOR_TIERS.find((t) => t.id === tierName);
    return {
      id: id as BadgeId,
      name: tier ? `${tier.name} Contributor` : 'Contributor',
      description: 'Made significant contributions to the platform',
      icon: tier ? (
        <ContributorTierBadge level={tier.level} size="100%" />
      ) : (
        <ContributorBadge className="w-6 h-6" />
      ),
    };
  }

  if (upper.startsWith('PREMIUM')) {
    const tierName = upper.replace('PREMIUM_', '');
    const tier = PREMIUM_TIERS.find((t) => t.id === tierName);
    return {
      id: id as BadgeId,
      name: tier ? `${tier.name} Premium` : 'Premium',
      description: 'Active Premium Subscription',
      icon: tier ? (
        <PremiumTierBadge level={tier.level} size="100%" />
      ) : (
        <PremiumBadge className="w-6 h-6" />
      ),
    };
  }

  return undefined;
}
