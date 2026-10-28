export interface SafetyNewsArticle {
  id: string;
  category: 'Safety' | 'Policy' | 'Privacy' | 'Moderation';
  topic:
    'Account Security' | 'Moderation' | 'Parents and Teens' | 'Partnerships' | 'Platform Integrity';
  title: string;
  description: string;
  date: string;
  readTime: string;
  isFeatured?: boolean;
  illustrationType:
    | 'hero-mascot'
    | 'teen-switches'
    | 'girl-screens'
    | 'partnership'
    | 'safer-day'
    | 'moderation-console'
    | 'cryptography'
    | 'server-badge'
    | 'wellbeing';
  href: string;
}

export interface SafetyNewsTranslation {
  hero: {
    title: string;
    subtitle: string;
  };
  filters: {
    allCategories: string;
    categories: {
      all: string;
      moderation: string;
      policy: string;
      privacy: string;
      safety: string;
    };
    allTopics: string;
    topics: {
      all: string;
      accountSecurity: string;
      moderation: string;
      parentsAndTeens: string;
      partnerships: string;
      platformIntegrity: string;
    };
    searchPlaceholder: string;
    noResultsTitle: string;
    noResultsDesc: string;
    clearFilters: string;
    showingResults: string;
    loadMore: string;
    showLess: string;
  };
  articles: SafetyNewsArticle[];
}

export const SAFETY_NEWS_DATA: Record<'en' | 'uk', SafetyNewsTranslation> = {
  en: {
    hero: {
      title: 'ETERNAL SAFETY NEWS HUB',
      subtitle: "The latest news and updates on Eternal's Safety, Privacy, and Policy initiatives.",
    },
    filters: {
      allCategories: 'View All',
      categories: {
        all: 'All Categories',
        moderation: 'Moderation',
        policy: 'Policy',
        privacy: 'Privacy',
        safety: 'Safety',
      },
      allTopics: 'Pick a Topic',
      topics: {
        all: 'All Topics',
        accountSecurity: 'Account Security',
        moderation: 'Moderation',
        parentsAndTeens: 'Parents and Teens',
        partnerships: 'Partnerships',
        platformIntegrity: 'Platform Integrity',
      },
      searchPlaceholder: 'Search articles...',
      noResultsTitle: 'No articles found',
      noResultsDesc: 'Try adjusting your search query or filters to find what you are looking for.',
      clearFilters: 'Reset filters',
      showingResults: 'Showing',
      loadMore: 'Load More',
      showLess: 'Show Less',
    },
    articles: [
      {
        id: 'news-players-guide-wellbeing',
        category: 'Safety',
        topic: 'Parents and Teens',
        title:
          "A BETTER INTERNET STARTS WITH EDUCATION: INTRODUCING THE ETERNAL PLAYER'S GUIDE AND WELLBEING PRINCIPLES",
        description:
          'We believe in empowering young people, parents, and educators with practical tools. Our new Player’s Guide breaks down digital boundaries, positive communication, and mental health resources.',
        date: 'August 24, 2026',
        readTime: '6 min read',
        isFeatured: true,
        illustrationType: 'hero-mascot',
        href: '/safety-library',
      },
      {
        id: 'news-partnerships-ecpat',
        category: 'Policy',
        topic: 'Partnerships',
        title:
          'Better Communities Start With Us: Eternal Partners with International Safety Coalitions',
        description:
          'Expanding our global partnerships to protect young voices across Europe and Ukraine with shared threat intelligence and victim assistance programs.',
        date: 'August 18, 2026',
        readTime: '4 min read',
        illustrationType: 'partnership',
        href: '/category/policy',
      },
      {
        id: 'news-safer-experiences-teens',
        category: 'Safety',
        topic: 'Parents and Teens',
        title: 'How Eternal Is Building Safer Experiences for Teens',
        description:
          'From automated sensitive content filters to age-appropriate server recommendations, learn how our default protections keep teenagers safe.',
        date: 'August 12, 2026',
        readTime: '5 min read',
        illustrationType: 'girl-screens',
        href: '/safety-family-center',
      },
      {
        id: 'news-teen-by-default',
        category: 'Safety',
        topic: 'Platform Integrity',
        title: 'Introducing New Teen-By-Default Safety Experience',
        description:
          'Rolling out our strictest DM privacy, anti-spam filters, and friend request protections as automatic defaults for all accounts under 18.',
        date: 'July 29, 2026',
        readTime: '4 min read',
        illustrationType: 'teen-switches',
        href: '/terms/data-privacy-controls',
      },
      {
        id: 'news-safer-internet-day',
        category: 'Safety',
        topic: 'Parents and Teens',
        title: 'Celebrating Safer Internet Day with Young Voices',
        description:
          'Teen youth advisory council members share their best tips on creating authentic gaming communities while maintaining emotional wellbeing.',
        date: 'July 15, 2026',
        readTime: '5 min read',
        illustrationType: 'safer-day',
        href: '/category/community',
      },
      {
        id: 'news-automated-moderation-filters',
        category: 'Moderation',
        topic: 'Moderation',
        title: 'Enhancing Direct Message Filters and Automated Spam Shielding',
        description:
          'Our newly deployed machine learning models reduce unwanted contact and phishing attacks by over 94% across direct messages.',
        date: 'June 30, 2026',
        readTime: '4 min read',
        illustrationType: 'moderation-console',
        href: '/category/safety',
      },
      {
        id: 'news-cryptography-security-audit',
        category: 'Privacy',
        topic: 'Account Security',
        title: 'Transparency in Security: Upgrading End-to-End Cryptography Protocols',
        description:
          'Publishing the results of our independent cryptographic audit and key exchange enhancements for direct calls and secure channels.',
        date: 'June 10, 2026',
        readTime: '7 min read',
        illustrationType: 'cryptography',
        href: '/terms/data-privacy-controls',
      },
      {
        id: 'news-server-safety-badges',
        category: 'Moderation',
        topic: 'Platform Integrity',
        title: 'New Controls for Server Owners: Verified Mod Badges and Raid Protection',
        description:
          'Equipping server administrators with automated raid defense, suspicious account quarantines, and verified moderator identification.',
        date: 'May 22, 2026',
        readTime: '5 min read',
        illustrationType: 'server-badge',
        href: '/guidelines',
      },
      {
        id: 'news-mental-health-toolkit',
        category: 'Safety',
        topic: 'Parents and Teens',
        title: 'Eternal Digital Wellbeing Principles and Mental Health Toolkit',
        description:
          'Resources crafted in collaboration with mental health professionals to help users establish healthy screen time habits and overcome online fatigue.',
        date: 'May 04, 2026',
        readTime: '6 min read',
        illustrationType: 'wellbeing',
        href: '/category/safety',
      },
    ],
  },
  uk: {
    hero: {
      title: 'ХАБ НОВИН БЕЗПЕКИ ETERNAL',
      subtitle: 'Останні новини та оновлення щодо безпеки, приватності та політик Eternal.',
    },
    filters: {
      allCategories: 'Усі категорії',
      categories: {
        all: 'Усі категорії',
        moderation: 'Модерація',
        policy: 'Політики',
        privacy: 'Приватність',
        safety: 'Безпека',
      },
      allTopics: 'Оберіть тему',
      topics: {
        all: 'Усі теми',
        accountSecurity: 'Безпека акаунта',
        moderation: 'Модерація',
        parentsAndTeens: 'Батьки та підлітки',
        partnerships: 'Партнерства',
        platformIntegrity: 'Цілісність платформи',
      },
      searchPlaceholder: 'Пошук статей...',
      noResultsTitle: 'Статей не знайдено',
      noResultsDesc: 'Спробуйте змінити пошуковий запит або обрати інші фільтри.',
      clearFilters: 'Скинути фільтри',
      showingResults: 'Відображено',
      loadMore: 'Більше статей',
      showLess: 'Показати менше',
    },
    articles: [
      {
        id: 'news-players-guide-wellbeing',
        category: 'Safety',
        topic: 'Parents and Teens',
        title:
          'КРАЩИЙ ІНТЕРНЕТ ПОЧИНАЄТЬСЯ З ОСВІТИ: ПРЕДСТАВЛЯЄМО ПОСІБНИК ГРАВЦЯ ТА ПРИНЦИПИ ДОБРОБУТУ ETERNAL',
        description:
          'Ми прагнемо надати підліткам, батькам та викладачам корисні інструменти. Наш новий посібник гравця розповідає про цифрові межі, культуру спілкування та психологічну підтримку.',
        date: '24 серпня 2026',
        readTime: '6 хв читання',
        isFeatured: true,
        illustrationType: 'hero-mascot',
        href: '/safety-library',
      },
      {
        id: 'news-partnerships-ecpat',
        category: 'Policy',
        topic: 'Partnerships',
        title:
          'Кращі спільноти починаються з нас: Eternal об’єднує зусилля з міжнародними коаліціями захисту',
        description:
          'Розширення міжнародних партнерств для захисту молоді в Європі та Україні через спільний аналіз загроз та програми підтримки.',
        date: '18 серпня 2026',
        readTime: '4 хв читання',
        illustrationType: 'partnership',
        href: '/category/policy',
      },
      {
        id: 'news-safer-experiences-teens',
        category: 'Safety',
        topic: 'Parents and Teens',
        title: 'Як Eternal будує безпечніший простір для підлітків',
        description:
          'Від автоматичних фільтрів чутливого контенту до безпечних рекомендацій серверів — дізнайтеся про налаштування за замовчуванням.',
        date: '12 серпня 2026',
        readTime: '5 хв читання',
        illustrationType: 'girl-screens',
        href: '/safety-family-center',
      },
      {
        id: 'news-teen-by-default',
        category: 'Safety',
        topic: 'Platform Integrity',
        title: 'Впровадження нових налаштувань безпеки за замовчуванням для підлітків',
        description:
          'Найсуворіші фільтри особистих повідомлень, захист від спаму та обмеження запитів у друзі тепер активовані для всіх користувачів до 18 років.',
        date: '29 липня 2026',
        readTime: '4 хв читання',
        illustrationType: 'teen-switches',
        href: '/terms/data-privacy-controls',
      },
      {
        id: 'news-safer-internet-day',
        category: 'Safety',
        topic: 'Parents and Teens',
        title: 'День безпечного інтернету разом із голосами молоді',
        description:
          'Учасники молодіжної ради безпеки діляться порадами щодо створення дружніх ігрових спільнот та збереження емоційного балансу.',
        date: '15 липня 2026',
        readTime: '5 хв читання',
        illustrationType: 'safer-day',
        href: '/category/community',
      },
      {
        id: 'news-automated-moderation-filters',
        category: 'Moderation',
        topic: 'Moderation',
        title: 'Покращення фільтрації особистих повідомлень та автоматичний захист від спаму',
        description:
          'Нові моделі машинного навчання знижують кількість небажаних контактів та фішингових посилань на понад 94%.',
        date: '30 червня 2026',
        readTime: '4 хв читання',
        illustrationType: 'moderation-console',
        href: '/category/safety',
      },
      {
        id: 'news-cryptography-security-audit',
        category: 'Privacy',
        topic: 'Account Security',
        title: 'Прозорість безпеки: оновлення протоколів наскрізного шифрування',
        description:
          'Публікація результатів незалежного криптографічного аудиту та покращення протоколів обміну ключами для захищених дзвінків.',
        date: '10 червня 2026',
        readTime: '7 хв читання',
        illustrationType: 'cryptography',
        href: '/terms/data-privacy-controls',
      },
      {
        id: 'news-server-safety-badges',
        category: 'Moderation',
        topic: 'Platform Integrity',
        title: 'Нові інструменти для власників серверів: бейджі модераторів та захист від рейдів',
        description:
          'Автоматичний захист від масового спаму, карантин підозрілих акаунтів та верифікація модераторів спільноти.',
        date: '22 травня 2026',
        readTime: '5 хв читання',
        illustrationType: 'server-badge',
        href: '/guidelines',
      },
      {
        id: 'news-mental-health-toolkit',
        category: 'Safety',
        topic: 'Parents and Teens',
        title: 'Принципи цифрового добробуту Eternal та набір інструментів психічного здоров’я',
        description:
          'Матеріали, розроблені спільно з фахівцями у сфері ментального здоров’я, для здорового балансу екранного часу.',
        date: '04 травня 2026',
        readTime: '6 хв читання',
        illustrationType: 'wellbeing',
        href: '/category/safety',
      },
    ],
  },
};
