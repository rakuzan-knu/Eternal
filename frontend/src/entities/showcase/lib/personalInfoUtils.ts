export const LANGUAGE_FLAGS: Record<string, string> = {
  english: '🇬🇧',
  ukrainian: '🇺🇦',
  german: '🇩🇪',
  polish: '🇵🇱',
  spanish: '🇪🇸',
  french: '🇫🇷',
  italian: '🇮🇹',
  japanese: '🇯🇵',
  chinese: '🇨🇳',
  korean: '🇰🇷',
  portuguese: '🇵🇹',
  turkish: '🇹🇷',
  czech: '🇨🇿',
  slovak: '🇸🇰',
  dutch: '🇳🇱',
  swedish: '🇸🇪',
  norwegian: '🇳🇴',
  finnish: '🇫🇮',
  danish: '🇩🇰',
  greek: '🇬🇷',
  arabic: '🇸🇦',
  hebrew: '🇮🇱',
  hindi: '🇮🇳',
  vietnamese: '🇻🇳',
  thai: '🇹🇭',
  indonesian: '🇮🇩',
  romanian: '🇷🇴',
  hungarian: '🇭🇺',
};

export function getLanguageFlag(lang: string): string {
  const clean = lang.trim().toLowerCase();
  for (const [key, flag] of Object.entries(LANGUAGE_FLAGS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return flag;
    }
  }
  return '🌐';
}

export const POPULAR_LANGUAGES = [
  'English',
  'Ukrainian',
  'German',
  'Polish',
  'Spanish',
  'French',
  'Italian',
  'Japanese',
  'Korean',
  'Portuguese',
];

export const FAMILY_ROLES = [
  'Brother',
  'Sister',
  'Mother',
  'Father',
  'Son',
  'Daughter',
  'Grandmother',
  'Grandfather',
  'Cousin',
  'Aunt',
  'Uncle',
  'Relative',
] as const;

export const WORKPLACE_STATUSES = [
  'Employed',
  'Intern',
  'Founder',
  'Freelancer',
  'Contractor',
] as const;

export const EDUCATION_STATUSES = [
  "Student '28",
  "Student '27",
  "Student '26",
  "Student '25",
  'Alumni',
  'Graduated',
  'Researcher',
] as const;

export const RELATIONSHIP_CONFIG: Record<
  string,
  { label: string; icon: string; badgeColor: string }
> = {
  single: { label: 'Without steam', icon: '🕊️', badgeColor: 'text-amber-300' },
  in_relationship: { label: 'In a relationship', icon: '❤️', badgeColor: 'text-rose-400' },
  engaged: { label: 'Engaged', icon: '💍', badgeColor: 'text-cyan-300' },
  married: { label: 'Married', icon: '💒', badgeColor: 'text-pink-400' },
  civil_marriage: { label: 'In a civil marriage', icon: '🤝', badgeColor: 'text-indigo-300' },
  shared_accommodation: {
    label: 'Shared accommodation',
    icon: '🏠',
    badgeColor: 'text-emerald-300',
  },
  open_relationship: { label: 'In an open relationship', icon: '🔓', badgeColor: 'text-teal-300' },
  complicated: { label: 'Everything is complicated.', icon: '🌀', badgeColor: 'text-purple-300' },
  separated: { label: 'They broke up.', icon: '💔', badgeColor: 'text-orange-400' },
  divorced: { label: 'Divorced', icon: '📄', badgeColor: 'text-gray-400' },
  widowed: { label: 'Widower/widow', icon: '🕯️', badgeColor: 'text-stone-400' },
};

export function formatRelationshipDuration(sinceStr?: string | null): string | null {
  if (!sinceStr) return null;
  const sinceDate = new Date(sinceStr);
  if (isNaN(sinceDate.getTime())) return null;

  const now = new Date();
  if (sinceDate > now) return null;

  let years = now.getFullYear() - sinceDate.getFullYear();
  let months = now.getMonth() - sinceDate.getMonth();
  let days = now.getDate() - sinceDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0 && months > 0) {
    const yText = years === 1 ? '1 year' : `${years} years`;
    const mText = months === 1 ? '1 month' : `${months} months`;
    return `Together for ${yText}, ${mText}`;
  }
  if (years > 0) {
    const yText = years === 1 ? '1 year' : `${years} years`;
    return `Together for ${yText}`;
  }
  if (months > 0) {
    const mText = months === 1 ? '1 month' : `${months} months`;
    return `Together for ${mText}`;
  }
  if (days > 1) {
    return `Together for ${days} days`;
  }
  return 'Together since today';
}

export function getTimePhaseAndOffset(targetTimezone: string): {
  phaseIcon: string;
  phaseLabel: string;
  relativeOffset: string;
} {
  try {
    const now = new Date();
    // Get target time details
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: 'numeric',
      hour12: false,
    });
    const targetHour = parseInt(targetFormatter.format(now), 10);

    let phaseIcon = '☀️';
    let phaseLabel = 'Day';
    if (targetHour >= 6 && targetHour < 9) {
      phaseIcon = '🌅';
      phaseLabel = 'Morning';
    } else if (targetHour >= 9 && targetHour < 19) {
      phaseIcon = '☀️';
      phaseLabel = 'Day';
    } else if (targetHour >= 19 && targetHour < 22) {
      phaseIcon = '🌇';
      phaseLabel = 'Evening';
    } else {
      phaseIcon = '🌙';
      phaseLabel = 'Night';
    }

    const visitorDate = new Date();
    const targetDateStr = now.toLocaleString('en-US', { timeZone: targetTimezone });
    const targetDate = new Date(targetDateStr);

    const diffHours = Math.round((targetDate.getTime() - visitorDate.getTime()) / 3600000);

    let relativeOffset = 'Same time as you';
    if (diffHours > 0) {
      relativeOffset = `+${diffHours}h ahead of you`;
    } else if (diffHours < 0) {
      relativeOffset = `${Math.abs(diffHours)}h behind you`;
    }

    return { phaseIcon, phaseLabel, relativeOffset };
  } catch {
    return { phaseIcon: '☀️', phaseLabel: 'Day', relativeOffset: 'Same time as you' };
  }
}
