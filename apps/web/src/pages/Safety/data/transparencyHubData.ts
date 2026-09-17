export interface TransparencyReportItem {
  id: string;
  year: string;
  period: string;
  title: string;
  pdfUrl?: string;
  isSpecial?: boolean;
}

export interface TransparencyArticle {
  id: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
  date: string;
  illustrationType: 'moderation' | 'hammer' | 'community';
  href: string;
}

export interface TransparencyTranslation {
  hero: {
    title: string;
    subtitle: string;
  };
  reportsSection: {
    title: string;
    description: string;
    downloadBtn: string;
    reports: TransparencyReportItem[];
  };
  dsaSection: {
    title: string;
    description: string;
    downloadBtn: string;
    reports: TransparencyReportItem[];
  };
  actionSection: {
    title: string;
    subtitle: string;
    loadMore: string;
    showLess: string;
    articles: TransparencyArticle[];
  };
}

export const TRANSPARENCY_HUB_DATA: Record<'en' | 'uk', TransparencyTranslation> = {
  en: {
    hero: {
      title: 'ETERNAL TRANSPARENCY HUB',
      subtitle:
        'Explore data, trends, and analysis into the work done to help keep people on Eternal safe. Transparency reports cover information about enforcement of our platform policies, as well as our response to user data and intellectual property requests.',
    },
    reportsSection: {
      title: 'TRANSPARENCY REPORTS',
      description:
        "Read our Transparency Report, covering our enforcement actions against accounts and servers violating Eternal's platform policies, as well as our response to legal, emergency and intellectual property removal requests.",
      downloadBtn: 'Download Report',
      reports: [
        { id: '2026-annual', year: '2026', period: 'Annual', title: '2026 Transparency Report' },
        {
          id: '2026-tco',
          year: '2026',
          period: 'TCO Report',
          title: '2026: TCO Report',
          isSpecial: true,
        },
        { id: '2025-h2', year: '2025', period: 'H2', title: '2025: H2 Transparency Report' },
        { id: '2025-h1', year: '2025', period: 'H1', title: '2025: H1 Transparency Report' },
        { id: '2024-h2', year: '2024', period: 'H2', title: '2024: H2 Transparency Report' },
        { id: '2024-h1', year: '2024', period: 'H1', title: '2024: H1 Transparency Report' },
        { id: '2023-q4', year: '2023', period: 'Q4', title: '2023: Q4 Transparency Report' },
        { id: '2023-q3', year: '2023', period: 'Q3', title: '2023: Q3 Transparency Report' },
        { id: '2023-q2', year: '2023', period: 'Q2', title: '2023: Q2 Transparency Report' },
        { id: '2023-q1', year: '2023', period: 'Q1', title: '2023: Q1 Transparency Report' },
        { id: '2022-q3', year: '2022', period: 'Q3', title: '2022: Q3 Transparency Report' },
        { id: '2022-q2', year: '2022', period: 'Q2', title: '2022: Q2 Transparency Report' },
        { id: '2022-q1', year: '2022', period: 'Q1', title: '2022: Q1 Transparency Report' },
      ],
    },
    dsaSection: {
      title: 'DIGITAL SERVICES ACT REPORTS',
      description:
        'Read our DSA Report to understand our approach to content moderation and how we protect users in the European Union and Ukraine pursuant to Regulation (EU) 2022/2065.',
      downloadBtn: 'Download Report',
      reports: [
        {
          id: 'dsa-2026',
          year: '2026',
          period: 'Full Year',
          title: '2026 DSA Transparency Report',
        },
        { id: 'dsa-2025-h2', year: '2025', period: 'H2', title: '2025: H2 DSA Enforcement Audit' },
        { id: 'dsa-2025-h1', year: '2025', period: 'H1', title: '2025: H1 DSA Compliance Report' },
        {
          id: 'dsa-2024-h2',
          year: '2024',
          period: 'H2',
          title: '2024: H2 DSA Moderation Overview',
        },
      ],
    },
    actionSection: {
      title: 'TRANSPARENCY IN ACTION',
      subtitle:
        'Dive deeper into how our Trust & Safety and engineering teams put transparency principles into practice.',
      loadMore: 'Load More',
      showLess: 'Show Less',
      articles: [
        {
          id: 'art-transparency-moderation',
          category: 'Moderation',
          title: 'Transparency in Moderation',
          description:
            'How we balance user privacy with rigorous community safety standards through automated filters and human moderation teams.',
          readTime: '4 min read',
          date: 'August 2026',
          illustrationType: 'moderation',
          href: '/category/safety',
        },
        {
          id: 'art-trust-safety-extremism',
          category: 'Safety',
          title: 'How Trust-Safety Addresses Harmful Content on Eternal',
          description:
            'Proactive threat hunting, hash-matching technologies, and collaboration with global law enforcement agencies to keep bad actors off the network.',
          readTime: '6 min read',
          date: 'July 2026',
          illustrationType: 'hammer',
          href: '/category/safety',
        },
        {
          id: 'art-better-place-together',
          category: 'Safety',
          title: 'Building a better place to play and chill together as teens go back to school',
          description:
            'New teen safety defaults, enhanced DM filters, and Family Center updates designed to protect young voices online.',
          readTime: '5 min read',
          date: 'August 2026',
          illustrationType: 'community',
          href: '/category/community',
        },
        {
          id: 'art-encryption-audit',
          category: 'Security',
          title: 'Zero-Knowledge Voice and Direct Message Cryptography Audit',
          description:
            'Independent third-party verification of our end-to-end encryption protocols and forward secrecy keys.',
          readTime: '7 min read',
          date: 'June 2026',
          illustrationType: 'moderation',
          href: '/category/safety',
        },
        {
          id: 'art-copyright-ip-enforcement',
          category: 'Legal',
          title: 'Intellectual Property and DMCA Response Metrics',
          description:
            'A breakdown of trademark, patent, and copyright infringement takedown notices received and resolved in 2026.',
          readTime: '4 min read',
          date: 'May 2026',
          illustrationType: 'hammer',
          href: '/category/policy',
        },
        {
          id: 'art-family-safety-commitments',
          category: 'Safety',
          title: 'Teen Safety and Digital Literacy Commitments in Ukraine and Europe',
          description:
            'Partnering with educators and mental health charities to foster respectful, creative digital spaces for youth.',
          readTime: '5 min read',
          date: 'April 2026',
          illustrationType: 'community',
          href: '/safety-family-center',
        },
      ],
    },
  },
  uk: {
    hero: {
      title: 'ХАБ ПРОЗОРОСТІ ETERNAL',
      subtitle:
        'Досліджуйте дані, тренди та аналітику заходів безпеки в Eternal. Звіти про прозорість містять детальну інформацію про дотримання правил нашої платформи, обробку запитів даних та захист інтелектуальної власності.',
    },
    reportsSection: {
      title: 'ЗВІТИ ПРО ПРОЗОРІСТЬ',
      description:
        'Ознайомтеся з нашими офіційними звітами про заходи щодо акаунтів і серверів, які порушують правила платформи Eternal, а також про відповіді на правові запити та скарги на захист авторських прав.',
      downloadBtn: 'Завантажити звіт',
      reports: [
        { id: '2026-annual', year: '2026', period: 'Річний', title: 'Звіт про прозорість 2026' },
        {
          id: '2026-tco',
          year: '2026',
          period: 'Звіт TCO',
          title: '2026: Звіт TCO',
          isSpecial: true,
        },
        {
          id: '2025-h2',
          year: '2025',
          period: '2-ге півріччя',
          title: '2025: H2 Звіт про прозорість',
        },
        {
          id: '2025-h1',
          year: '2025',
          period: '1-ше півріччя',
          title: '2025: H1 Звіт про прозорість',
        },
        {
          id: '2024-h2',
          year: '2024',
          period: '2-ге півріччя',
          title: '2024: H2 Звіт про прозорість',
        },
        {
          id: '2024-h1',
          year: '2024',
          period: '1-ше півріччя',
          title: '2024: H1 Звіт про прозорість',
        },
        {
          id: '2023-q4',
          year: '2023',
          period: '4-й квартал',
          title: '2023: Q4 Звіт про прозорість',
        },
        {
          id: '2023-q3',
          year: '2023',
          period: '3-й квартал',
          title: '2023: Q3 Звіт про прозорість',
        },
        {
          id: '2023-q2',
          year: '2023',
          period: '2-й квартал',
          title: '2023: Q2 Звіт про прозорість',
        },
        {
          id: '2023-q1',
          year: '2023',
          period: '1-й квартал',
          title: '2023: Q1 Звіт про прозорість',
        },
        {
          id: '2022-q3',
          year: '2022',
          period: '3-й квартал',
          title: '2022: Q3 Звіт про прозорість',
        },
        {
          id: '2022-q2',
          year: '2022',
          period: '2-й квартал',
          title: '2022: Q2 Звіт про прозорість',
        },
        {
          id: '2022-q1',
          year: '2022',
          period: '1-й квартал',
          title: '2022: Q1 Звіт про прозорість',
        },
      ],
    },
    dsaSection: {
      title: 'ЗВІТИ ЗАКОНУ ПРО ЦИФРОВІ ПОСЛУГИ (DSA)',
      description:
        'Дізнайтеся більше про наш підхід до модерації контенту та захисту користувачів у Європейському Союзі та Україні відповідно до Регламенту (ЄС) 2022/2065.',
      downloadBtn: 'Завантажити звіт',
      reports: [
        { id: 'dsa-2026', year: '2026', period: 'Річний', title: 'Звіт DSA 2026' },
        {
          id: 'dsa-2025-h2',
          year: '2025',
          period: '2-ге півріччя',
          title: '2025: H2 Звіт модерації DSA',
        },
        {
          id: 'dsa-2025-h1',
          year: '2025',
          period: '1-ше півріччя',
          title: '2025: H1 Звіт відповідності DSA',
        },
        {
          id: 'dsa-2024-h2',
          year: '2024',
          period: '2-ге півріччя',
          title: '2024: H2 Заходи безпеки DSA',
        },
      ],
    },
    actionSection: {
      title: 'ПРОЗОРІСТЬ У ДІЇ',
      subtitle:
        'Дізнайтеся, як наші команди безпеки та розробки втілюють принципи відкритості та надійності у життя.',
      loadMore: 'Більше статей',
      showLess: 'Показати менше',
      articles: [
        {
          id: 'art-transparency-moderation',
          category: 'Модерація',
          title: 'Прозорість у модерації контенту',
          description:
            'Як ми поєднуємо конфіденційність користувачів із високими стандартами безпеки спільнот за допомогою автоматичних фільтрів та модераторів.',
          readTime: '4 хв читання',
          date: 'Серпень 2026',
          illustrationType: 'moderation',
          href: '/category/safety',
        },
        {
          id: 'art-trust-safety-extremism',
          category: 'Безпека',
          title: 'Як команда Trust & Safety бореться з небезпечним контентом у Eternal',
          description:
            'Проактивне виявлення загроз, зіставлення хешів та взаємодія з правоохоронними органами для недопущення зловживань.',
          readTime: '6 хв читання',
          date: 'Липень 2026',
          illustrationType: 'hammer',
          href: '/category/safety',
        },
        {
          id: 'art-better-place-together',
          category: 'Безпека',
          title: 'Створюємо безпечний простір для підлітків та молоді у новому навчальному році',
          description:
            'Нові налаштування безпеки за замовчуванням для підлітків, захист особистих повідомлень та оновлення Сімейного центру.',
          readTime: '5 хв читання',
          date: 'Серпень 2026',
          illustrationType: 'community',
          href: '/category/community',
        },
        {
          id: 'art-encryption-audit',
          category: 'Безпека',
          title: 'Аудит криптографічного захисту голосового зв’язку та чатів',
          description:
            'Незалежна перевірка наскрізного шифрування та протоколів безпеки серверів Eternal.',
          readTime: '7 хв читання',
          date: 'Червень 2026',
          illustrationType: 'moderation',
          href: '/category/safety',
        },
        {
          id: 'art-copyright-ip-enforcement',
          category: 'Правові питання',
          title: 'Статистика захисту авторських прав та запитів DMCA',
          description:
            'Огляд запитів на захист торговельних марок та авторського контенту, отриманих у 2026 році.',
          readTime: '4 хв читання',
          date: 'Травень 2026',
          illustrationType: 'hammer',
          href: '/category/policy',
        },
        {
          id: 'art-family-safety-commitments',
          category: 'Безпека',
          title: 'Ініціативи з цифрової грамотності для сімей в Україні та Європі',
          description:
            'Співпраця з викладачами та організаціями для підтримки культури взаємоповаги в цифровому середовищі.',
          readTime: '5 хв читання',
          date: 'Квітень 2026',
          illustrationType: 'community',
          href: '/safety-family-center',
        },
      ],
    },
  },
};
