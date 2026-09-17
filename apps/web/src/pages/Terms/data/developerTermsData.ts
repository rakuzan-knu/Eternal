export interface DeveloperTermsSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface DeveloperTermsSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: DeveloperTermsSubsection[];
}

export interface DeveloperTermsTranslation {
  hero: {
    archivedLink: string;
    title: string;
    effectiveDate: string;
    lastUpdated: string;
    description: string;
  };
  toc: {
    contents: string;
    readProgress: string;
    print: string;
    backToTop: string;
  };
  sections: DeveloperTermsSection[];
}

export const DEVELOPER_TERMS_DATA: Record<'en' | 'uk', DeveloperTermsTranslation> = {
  en: {
    hero: {
      archivedLink: 'Developer & API Portal',
      title: 'DEVELOPER & BOT API TERMS OF SERVICE',
      effectiveDate: 'Effective: September 1, 2026 • Last updated: August 30, 2026',
      lastUpdated: 'Last Updated: August 30, 2026',
      description:
        'These Developer Terms govern your access to and use of Eternal’s APIs, SDKs, developer portals, and bot creation tools. They set forth security obligations, rate limits, and data protection standards for building custom bots and integrations.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'developer-overview',
        number: '1',
        title: 'Developer Platform & Scope of Agreement',
        iconName: 'Code',
        tldr: 'These terms apply to all developers creating bots, webhooks, and third-party integrations using the Eternal API.',
        subsections: [
          {
            id: 'developer-mission',
            title: '1.1 Building on the Eternal Platform',
            content: [
              'Eternal provides a powerful developer ecosystem allowing creators, communities, and developers to build custom automated bots, moderation utilities, music companion tools, and rich interactive experiences.',
              'By accessing our APIs, registering an application in the Eternal Developer Portal, or deploying a bot, you agree to comply with these Developer Terms, our Terms of Service, and our Community Guidelines.',
            ],
          },
        ],
      },
      {
        id: 'api-security-and-tokens',
        number: '2',
        title: 'API Token Security & Confidentiality',
        iconName: 'KeyRound',
        tldr: 'You must keep bot tokens strictly confidential. Never commit secrets to public repositories or share them with unauthorized parties.',
        subsections: [
          {
            id: 'token-protection',
            title: '2.1 Safeguarding Credentials',
            content: [
              'Your API keys, client secrets, and bot authorization tokens represent the identity of your application:',
            ],
            bullets: [
              'You must never publish, commit, or expose API tokens in public Git repositories or client-side code.',
              'If you suspect a token has been compromised, you must immediately reset the token in the Developer Portal.',
              'Eternal reserves the right to automatically revoke any token found publicly leaked or used in abusive traffic patterns.',
            ],
          },
        ],
      },
      {
        id: 'rate-limits-and-integrity',
        number: '3',
        title: 'Rate Limits, Server Health & Fair Usage',
        iconName: 'Cpu',
        tldr: 'Respect HTTP 429 rate limit backoff headers. Do not overload Eternal infrastructure with abusive polling loops.',
        subsections: [
          {
            id: 'rate-limit-rules',
            title: '3.1 API Rate Limiting Standards',
            content: [
              'To ensure high availability and responsiveness across the entire network, API calls are subject to predefined rate limits per endpoint and per bot token.',
              'Applications must respect HTTP 429 ("Too Many Requests") responses and implement exponential backoff retry algorithms. Deliberate attempts to bypass rate limits using rotating proxies will result in immediate API blacklisting.',
            ],
          },
        ],
      },
      {
        id: 'prohibited-developer-conduct',
        number: '4',
        title: 'Prohibited Bot Activities & Scraping',
        iconName: 'ShieldAlert',
        tldr: 'Automated user message scraping, unauthorized direct message spam, self-bots, and surveillance dossiers are strictly banned.',
        subsections: [
          {
            id: 'prohibited-uses',
            title: '4.1 Forbidden API Practices',
            content: ['When developing for Eternal, you must NOT:'],
            bullets: [
              'Deploy "self-bots" (automating standard user credentials rather than registered bot tokens).',
              'Scrape, harvest, or aggregate user profile data, contact lists, or messages to build commercial intelligence dossiers.',
              'Send unsolicited promotional direct messages or automated invite blasts to users who have not opted in.',
              'Facilitate gambling, cryptocurrency pump-and-dump schemes, or unauthorized payment collection.',
            ],
          },
        ],
      },
      {
        id: 'data-caching-and-privacy',
        number: '5',
        title: 'Data Protection, Caching & Deletion Webhooks',
        iconName: 'Database',
        tldr: 'Cached user data must not exceed 30 days. You must honor user account deletion webhooks within 48 hours.',
        subsections: [
          {
            id: 'caching-limits',
            title: '5.1 Responsible Data Management',
            content: [
              'Developers may cache necessary user information solely for the duration required to operate application functionality (not to exceed 30 days).',
              'If a user removes your application or exercises their right to be forgotten via an Eternal deletion webhook, you must erase their cached data from your servers within 48 hours.',
            ],
          },
        ],
      },
      {
        id: 'developer-support',
        number: '6',
        title: 'Developer Support & Inquiries',
        iconName: 'Mail',
        tldr: 'For API technical assistance, developer tier upgrades, or bot verification, contact developers@eternal.app.',
        subsections: [
          {
            id: 'dev-contacts',
            title: '6.1 Direct Developer Contact',
            content: [
              'For developer support, API partnership inquiries, or bot verification requests, please reach out to:',
            ],
            bullets: [
              'Developer Operations: developers@eternal.app',
              'Security & Vulnerability Reports: security@eternal.app',
              'Legal & Licensing: legal@eternal.app',
              'Platform: Eternal Inc., Kyiv, Ukraine',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Портал розробників та API',
      title: 'УМОВИ ВИКОРИСТАННЯ API ТА СТВОРЕННЯ БОТІВ',
      effectiveDate: 'Набуття чинності: 1 вересня 2026 р. • Останнє оновлення: 30 серпня 2026 р.',
      lastUpdated: 'Останнє оновлення: 30 серпня 2026 р.',
      description:
        'Ці умови регулюють доступ до API Eternal, SDK та інструментів розробки ботів. Документ визначає вимоги безпеки, захисту токенів, лімітів запитів (Rate Limits) та захисту конфіденційності користувачів.',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк умов',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'developer-overview',
        number: '1',
        title: 'Загальні положення платформи розробників',
        iconName: 'Code',
        tldr: 'Умови є обов’язковими для всіх розробників додатків, ботів та інтеграцій на базі API Eternal.',
        subsections: [
          {
            id: 'developer-mission',
            title: '1.1 Екосистема ботів Eternal',
            content: [
              'Eternal надає відкриті API для створення автоматизованих ботів, інструментів модерації, музичних помічників та інтерактивних спільнот.',
              'Реєструючи додаток у порталі розробників, ви зобов’язуєтеся дотримуватися цих Умов, Загальних правил сервісу та Політики безпеки.',
            ],
          },
        ],
      },
      {
        id: 'api-security-and-tokens',
        number: '2',
        title: 'Безпека та конфіденційність токенів API',
        iconName: 'KeyRound',
        tldr: 'Токени ботів є суворо конфіденційними. Заборонено публікувати секретні ключі у відкритих репозиторіях.',
        subsections: [
          {
            id: 'token-protection',
            title: '2.1 Захист облікових даних',
            content: ['Розробник несе повну відповідальність за безпеку отриманих API-токенів:'],
            bullets: [
              'Заборонено зберігати токени у відкритому коді або публічних Git-репозиторіях.',
              'У разі витоку токена його необхідно негайно скинути в панелі керування додатком.',
              'Eternal має право анулювати токени, виявлені у відкритому доступі.',
            ],
          },
        ],
      },
      {
        id: 'rate-limits-and-integrity',
        number: '3',
        title: 'Ліміти запитів (Rate Limits) та стабільність',
        iconName: 'Cpu',
        tldr: 'Дотримуйтеся лімітів API та коректно обробляйте помилки HTTP 429 для збереження стабільності сервісу.',
        subsections: [
          {
            id: 'rate-limit-rules',
            title: '3.1 Правила навантаження на систему',
            content: [
              'Для забезпечення швидкодії всі запити до API обмежуються лімітами. Додатки зобов’язані дотримуватися заголовків HTTP 429 та використовувати експоненційну затримку повторних запитів.',
            ],
          },
        ],
      },
      {
        id: 'prohibited-developer-conduct',
        number: '4',
        title: 'Заборонені дії: Спам, скрапінг та селф-боти',
        iconName: 'ShieldAlert',
        tldr: 'Категорично заборонено масовий спам, скрапінг даних користувачів та використання селф-ботів.',
        subsections: [
          {
            id: 'prohibited-uses',
            title: '4.1 Заборонені практики',
            content: ['Розробникам суворо заборонено:'],
            bullets: [
              'Використовувати селф-ботів (автоматизацію облікових записів звичайних користувачів замість офіційних бот-токенів).',
              'Збирати (скрапити) повідомлення або списки користувачів для створення комерційних баз даних.',
              'Здійснювати несанкціоновані рекламні розсилки в особисті повідомлення.',
            ],
          },
        ],
      },
      {
        id: 'data-caching-and-privacy',
        number: '5',
        title: 'Кешування даних та видалення за запитом',
        iconName: 'Database',
        tldr: 'Термін кешування даних користувачів не повинен перевищувати 30 днів. Видалення за вебхуком має виконуватися протягом 48 годин.',
        subsections: [
          {
            id: 'caching-limits',
            title: '5.1 Збереження та очищення даних',
            content: [
              'Дані користувачів можуть зберігатися в додатку розробника не більше 30 днів виключно для роботи функціоналу. У разі видалення акаунту дані мають бути стерті протягом 48 годин.',
            ],
          },
        ],
      },
      {
        id: 'developer-support',
        number: '6',
        title: 'Підтримка розробників',
        iconName: 'Mail',
        tldr: 'З технічних питань та верифікації ботів звертайтеся на developers@eternal.app.',
        subsections: [
          {
            id: 'dev-contacts',
            title: '6.1 Контактні реквізити',
            content: ['Служба підтримки розробників Eternal:'],
            bullets: [
              'Відділ розробників: developers@eternal.app',
              'Безпека та баг-баунті: security@eternal.app',
              'Юридичний відділ: legal@eternal.app',
              'Головний офіс: Eternal Inc., м. Київ, Україна',
            ],
          },
        ],
      },
    ],
  },
};
