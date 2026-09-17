/**
 * Counter-Strike 2 (CS2) Premier Rating & Skill Group Ranks Engine
 */

export interface CS2PremierInfo {
  rating: number;
  tierColor: string;
  tierName: string;
  formattedRating: string;
  badgeIcon: string;
}

export function calculateCS2Premier(rating: number = 17499): CS2PremierInfo {
  let tierColor = '#9099a1';
  let tierName = 'Common (Gray)';

  if (rating >= 30000) {
    tierColor = '#ffd700';
    tierName = 'Immortal (Gold)';
  } else if (rating >= 25000) {
    tierColor = '#e4ae39';
    tierName = 'Ancient (Red)';
  } else if (rating >= 20000) {
    tierColor = '#eb4b4b';
    tierName = 'Legendary (Pink)';
  } else if (rating >= 15000) {
    tierColor = '#d32ce6';
    tierName = 'Mythical (Purple)';
  } else if (rating >= 10000) {
    tierColor = '#4b69ff';
    tierName = 'Rare (Blue)';
  } else if (rating >= 5000) {
    tierColor = '#5e98d9';
    tierName = 'Uncommon (Light Blue)';
  }

  return {
    rating,
    tierColor,
    tierName,
    formattedRating: rating.toLocaleString(),
    badgeIcon:
      'https://raw.githubusercontent.com/steamdatabase/GameTracking-CS2/master/game/csgo/pak01_dir/resource/flash/econ/status_icons/skillgroup18.png',
  };
}
