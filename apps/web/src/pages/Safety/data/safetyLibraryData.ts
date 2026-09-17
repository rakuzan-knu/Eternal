export interface LibraryArticle {
  id: string;
  title: string;
  summary: string;
  category: 'Safety' | 'Moderation' | 'Policy' | 'Privacy';
  topics: string[];
  readTime: string;
  date: string;
  cardTheme: 'shield' | 'lock' | 'envelope' | 'community' | 'moderation' | 'privacy';
}

export interface SafetyLibraryTranslation {
  hero: {
    title: string;
    subtitle: string;
  };
  filters: {
    viewAll: string;
    categories: Record<string, string>;
    pickTopic: string;
    topics: Record<string, string>;
    searchPlaceholder: string;
    loadMore: string;
    noResults: string;
    resetFilters: string;
  };
  articleModal: {
    backToLibrary: string;
    estimatedRead: string;
    shareArticle: string;
    relatedTopics: string;
  };
}

export const ARTICLES_DATA: LibraryArticle[] = [
  {
    id: 'account-safety-steps',
    title: 'Four Steps to Keeping Your Account Safer',
    summary:
      'Explore the essential security practices for protecting your Eternal account, from two-factor authentication to password hygiene and session management.',
    category: 'Safety',
    topics: ['User Safety', 'Privacy'],
    readTime: '4 min read',
    date: 'Aug 24, 2026',
    cardTheme: 'shield',
  },
  {
    id: 'spam-and-hacking-tips',
    title: 'Tips against spam and hacking',
    summary:
      'Learn how to spot phishing links, suspicious bot invitations, social engineering attempts, and what to do if you suspect unauthorized activity.',
    category: 'Safety',
    topics: ['Account Security', 'User Safety'],
    readTime: '6 min read',
    date: 'Aug 20, 2026',
    cardTheme: 'envelope',
  },
  {
    id: 'age-restricted-content',
    title: 'Age-Restricted Content on Eternal',
    summary:
      'How age-gated channels, sensitive media blurring, and default safety filters keep our community appropriate for teens and adults alike.',
    category: 'Policy',
    topics: ['Server Safety', 'User Safety'],
    readTime: '5 min read',
    date: 'Aug 18, 2026',
    cardTheme: 'lock',
  },
  {
    id: 'reporting-applications',
    title: 'Reporting Applications and Violations to Eternal',
    summary:
      'A step-by-step walkthrough on how our Trust & Safety team processes reports, handles bad actors, and enforces Community Guidelines.',
    category: 'Safety',
    topics: ['Reporting', 'User Safety'],
    readTime: '3 min read',
    date: 'Aug 14, 2026',
    cardTheme: 'moderation',
  },
  {
    id: 'teen-community-exploration',
    title: 'How teens find and explore community on Eternal',
    summary:
      'Safety features designed specifically for young users, including default safety alerts, teen protective modes, and direct message safeguards.',
    category: 'Safety',
    topics: ['User Safety', 'Parents and Teens'],
    readTime: '7 min read',
    date: 'Aug 10, 2026',
    cardTheme: 'community',
  },
  {
    id: 'words-matter',
    title: 'Words Matter: Building healthy conversation spaces',
    summary:
      'Why positive tone and proactive communication cultivate resilient servers. How AutoMod helps filter toxicity before it harms friendships.',
    category: 'Moderation',
    topics: ['User Safety', 'Parents and Teens'],
    readTime: '5 min read',
    date: 'Aug 05, 2026',
    cardTheme: 'shield',
  },
  {
    id: 'privacy-controls-guide',
    title: 'Understanding End-to-End Privacy Controls',
    summary:
      'A deep dive into your data rights, custom telemetry settings, friend request controls, and end-to-end voice encryption protocols.',
    category: 'Privacy',
    topics: ['Platform Integrity', 'User Safety'],
    readTime: '6 min read',
    date: 'Jul 29, 2026',
    cardTheme: 'privacy',
  },
  {
    id: 'server-moderation-101',
    title: 'Server Moderation 101: AutoMod and Permissions',
    summary:
      'Master community management with granular role hierarchies, channel permission overwrites, slowmode timers, and automated keyword alerts.',
    category: 'Moderation',
    topics: ['Server Safety', 'Moderation'],
    readTime: '8 min read',
    date: 'Jul 22, 2026',
    cardTheme: 'moderation',
  },
  {
    id: 'social-engineering-defense',
    title: 'Protecting Yourself from Social Engineering',
    summary:
      'Never share verification codes or click untrusted qr logins. Understand common scams and how to safeguard your digital presence on Eternal.',
    category: 'Safety',
    topics: ['Account Security', 'Platform Integrity'],
    readTime: '5 min read',
    date: 'Jul 15, 2026',
    cardTheme: 'lock',
  },
];

export const SAFETY_LIBRARY_EN: SafetyLibraryTranslation = {
  hero: {
    title: 'SAFETY LIBRARY',
    subtitle:
      "Everything you could ever want to know about safety on Eternal. Whether you're a user, a moderator, or a parent, discover all of our tools and resources and how to use them.",
  },
  filters: {
    viewAll: 'View All',
    categories: {
      all: 'View All',
      Moderation: 'Moderation',
      Policy: 'Policy',
      Privacy: 'Privacy',
      Safety: 'Safety',
    },
    pickTopic: 'Pick a Topic',
    topics: {
      all: 'All Topics',
      'Account Security': 'Account Security',
      Moderation: 'Moderation',
      'Parents and Teens': 'Parents and Teens',
      Partnerships: 'Partnerships',
      'Platform Integrity': 'Platform Integrity',
      'User Safety': 'User Safety',
      'Server Safety': 'Server Safety',
      Reporting: 'Reporting',
    },
    searchPlaceholder: 'Search articles, policies, guides...',
    loadMore: 'Load More',
    noResults: 'No safety articles found matching your criteria.',
    resetFilters: 'Reset filters',
  },
  articleModal: {
    backToLibrary: 'Back to Safety Library',
    estimatedRead: 'Estimated read time',
    shareArticle: 'Share Article',
    relatedTopics: 'Related Topics',
  },
};

export const SAFETY_LIBRARY_UK: SafetyLibraryTranslation = {
  hero: {
    title: 'БІБЛІОТЕКА БЕЗПЕКИ',
    subtitle:
      'Усе, що ви хотіли б знати про безпеку в Eternal. Незалежно від того, чи ви користувач, модератор або батько, відкрийте для себе всі наші інструменти та рекомендації.',
  },
  filters: {
    viewAll: 'Всі категорії',
    categories: {
      all: 'Всі категорії',
      Moderation: 'Модерація',
      Policy: 'Правила та політики',
      Privacy: 'Приватність',
      Safety: 'Безпека',
    },
    pickTopic: 'Оберіть тему',
    topics: {
      all: 'Всі теми',
      'Account Security': 'Безпека облікового запису',
      Moderation: 'Модерація',
      'Parents and Teens': 'Батьки та підлітки',
      Partnerships: 'Партнерство',
      'Platform Integrity': 'Цілісність платформи',
      'User Safety': 'Безпека користувачів',
      'Server Safety': 'Безпека серверів',
      Reporting: 'Скарги та звернення',
    },
    searchPlaceholder: 'Пошук статей, правил, інструкцій...',
    loadMore: 'Завантажити ще',
    noResults: 'Статей за вашим запитом не знайдено.',
    resetFilters: 'Скинути фільтри',
  },
  articleModal: {
    backToLibrary: 'Назад до Бібліотеки безпеки',
    estimatedRead: 'Час читання',
    shareArticle: 'Поділитися статтею',
    relatedTopics: 'Схожі теми',
  },
};

export const SAFETY_LIBRARY_TRANSLATIONS: Record<string, SafetyLibraryTranslation> = {
  English: SAFETY_LIBRARY_EN,
  Українська: SAFETY_LIBRARY_UK,
  Deutsch: SAFETY_LIBRARY_EN,
  Español: SAFETY_LIBRARY_EN,
  Français: SAFETY_LIBRARY_EN,
};
