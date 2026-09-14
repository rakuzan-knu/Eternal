export interface DataPackageSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
  tip?: string;
  steps?: {
    stepNumber: number;
    title: string;
    description: string;
  }[];
}

export interface DataPackageSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr?: string;
  subsections: DataPackageSubsection[];
}

export interface DataPackageTranslation {
  hero: {
    archivedLink: string;
    title: string;
    author: string;
    updatedDate: string;
    followBtn: string;
    description: string;
  };
  coversBox: {
    title: string;
    items: {
      id: string;
      label: string;
      subItems?: { id: string; label: string }[];
    }[];
  };
  toc: {
    contents: string;
    readProgress: string;
    print: string;
    backToTop: string;
  };
  sections: DataPackageSection[];
}

export const DATA_PACKAGE_DATA: Record<'en' | 'uk', DataPackageTranslation> = {
  en: {
    hero: {
      archivedLink: 'Safety & Privacy Guides',
      title: 'Your Eternal Data Package',
      author: 'Eternal Privacy Team',
      updatedDate: 'Updated August 30, 2026',
      followBtn: 'Follow',
      description:
        'A comprehensive guide explaining what is included in your personal Eternal Data Package, how to request it on Desktop and Mobile, and how to read the exported JSON files.',
    },
    coversBox: {
      title: 'What this article covers:',
      items: [
        { id: 'what-is-data-package', label: 'What is a Data Package?' },
        {
          id: 'how-to-request',
          label: 'How to Request a Data Package',
          subItems: [
            { id: 'desktop-browser-guide', label: 'Desktop / Browser' },
            { id: 'mobile-guide', label: 'Mobile App' },
          ],
        },
        {
          id: 'inside-data-package',
          label: 'What information is inside a Data Package?',
          subItems: [
            { id: 'cat-account', label: 'Account' },
            { id: 'cat-activity', label: 'Activity' },
            { id: 'cat-activities', label: 'Activities & Integrations' },
            { id: 'cat-messages', label: 'Messages' },
            { id: 'cat-servers', label: 'Servers & Channels' },
            { id: 'cat-ads', label: 'Advertising & Explore' },
            { id: 'cat-support', label: 'Support Tickets' },
          ],
        },
        { id: 'retention-and-expiration', label: 'Download Links & Timelines' },
        { id: 'legal-and-dpo', label: 'Legal Portability & Contact Information' },
      ],
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Guide',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'what-is-data-package',
        number: '1',
        title: 'What Is A Data Package?',
        iconName: 'Package',
        tldr: 'A Data Package is an encrypted ZIP archive containing all your Eternal account information, messages, and settings formatted as structured JSON files.',
        subsections: [
          {
            id: 'data-package-overview',
            title: '1.1 Overview & File Format',
            content: [
              'A Data Package is a ZIP folder of files that you can request through your User Settings that contains all of your Eternal data for your account. This includes messages, current servers you belong to, activity logs, connected apps, and profile records.',
              'The files within the ZIP folder are standard JSON (JavaScript Object Notation) files. You can easily view them in Notepad on Windows, TextEdit on macOS, code editors like VS Code, or simply drag and drop them into modern web browsers such as Chrome, Firefox, or Safari.',
            ],
            tip: 'Tip: JSON files are structured text files. If you open them in a browser or online JSON viewer, you can collapse and expand sections for easy reading.',
          },
        ],
      },
      {
        id: 'how-to-request',
        number: '2',
        title: 'How To Request A Data Package',
        iconName: 'Download',
        tldr: 'Request your package via User Settings > Privacy > Request Data on desktop or mobile. You will receive an email download link within 30 days.',
        subsections: [
          {
            id: 'desktop-browser-guide',
            title: '2.1 Requesting on Desktop / Web Browser',
            content: [
              'Follow these step-by-step instructions to request your personal archive on Windows, macOS, Linux, or Web:',
            ],
            steps: [
              {
                stepNumber: 1,
                title: 'Open User Settings',
                description:
                  'Press the gear icon (⚙️) in the bottom-left sidebar of the Eternal app next to your avatar.',
              },
              {
                stepNumber: 2,
                title: 'Navigate to Privacy & Data',
                description:
                  'Select the "Privacy" category from the settings menu and scroll to "Request all of my data".',
              },
              {
                stepNumber: 3,
                title: 'Click Request Data',
                description:
                  'Press the "Request Data" button. The Submit Data Request modal window will appear.',
              },
              {
                stepNumber: 4,
                title: 'Select Data Categories',
                description:
                  'Choose which categories (Account, Activity, Messages, Servers, etc.) you want included in your export.',
              },
              {
                stepNumber: 5,
                title: 'Submit & Confirm',
                description:
                  'Click "Request My Data". You will receive a confirmation prompt stating your archive will be prepared within 30 days.',
              },
            ],
            tip: 'Important: If you disable or delete your account before receiving your download link, your pending data request will be automatically canceled.',
          },
          {
            id: 'mobile-guide',
            title: '2.2 Requesting on iOS & Android Mobile App',
            content: ['You can also request your full data package directly from the mobile app:'],
            steps: [
              {
                stepNumber: 1,
                title: 'Open Profile Tab',
                description:
                  'Tap your Avatar icon in the bottom-right navigation bar of the app to open your profile.',
              },
              {
                stepNumber: 2,
                title: 'Open App Settings',
                description:
                  'Tap the Settings Gear icon in the upper-right corner of your profile screen.',
              },
              {
                stepNumber: 3,
                title: 'Select Data & Privacy',
                description:
                  'Scroll down to the "Privacy" section and tap "Request all of my data".',
              },
              {
                stepNumber: 4,
                title: 'Confirm Export Request',
                description: 'Check desired data categories and tap "Request My Data".',
              },
            ],
          },
        ],
      },
      {
        id: 'inside-data-package',
        number: '3',
        title: 'What Information Is Inside A Data Package?',
        iconName: 'FolderArchive',
        tldr: 'The export includes folders for Account (avatars & settings), Activity (analytics & safety), Activities (games), Messages (chat history), Servers, Ads, and Support tickets.',
        subsections: [
          {
            id: 'cat-account',
            title: '3.1 Account Folder',
            content: ['The account folder contains all records pertaining to your user identity:'],
            bullets: [
              'User ID, username, discriminator/tag, phone number, and verified email address.',
              'Current and historical profile avatars and banner images.',
              'Configured account settings, notification preferences, and privacy rules.',
              'Connected OAuth applications and linked third-party accounts (Steam, Spotify, GitHub).',
            ],
          },
          {
            id: 'cat-activity',
            title: '3.2 Activity Folder',
            content: ['Contains four structured sub-folders detailing diagnostic interactions:'],
            bullets: [
              'Analytics: Diagnostic metrics used to measure interface responsiveness and stability.',
              'Modeling: Algorithmic preference weights used for community discovery recommendations.',
              'Reporting: Business operation records such as subscription history or Eternal Premium status.',
              'Trust & Safety (TNS): Security event logs, abuse reports, and device fingerprint hashes (retained up to 2 years for fraud prevention).',
            ],
          },
          {
            id: 'cat-activities',
            title: '3.3 Activities & Games Folder',
            content: [
              'Contains user data, scores, saved configurations, and state history for interactive embedded activities (Watch Together, Chess, Whiteboard, Canvas).',
            ],
          },
          {
            id: 'cat-messages',
            title: '3.4 Messages Folder',
            content: [
              'All sent private and group messages, structured by channel with timestamps and attachment links.',
            ],
          },
          {
            id: 'cat-servers',
            title: '3.5 Servers & Channels Folder',
            content: [
              'Detailed roster of servers you own or join, assigned roles, and channel permission overrides.',
            ],
          },
          {
            id: 'cat-ads',
            title: '3.6 Advertising & Explore Folder',
            content: [
              'Historical engagement with platform quests, sponsored developer integrations, and personalized recommendations.',
            ],
          },
          {
            id: 'cat-support',
            title: '3.7 Support Tickets Folder',
            content: [
              'All support correspondence, safety reports, and appeal tickets submitted through our help portals.',
            ],
          },
        ],
      },
      {
        id: 'retention-and-expiration',
        number: '4',
        title: 'Compilation Timelines & Link Expiration',
        iconName: 'Clock',
        tldr: 'Archives take up to 30 days to compile. The secure download link sent to your email remains valid for 30 calendar days.',
        subsections: [
          {
            id: 'expiration-rules',
            title: '4.1 Package Expiration & Automated Purge',
            content: [
              'To protect your sensitive data, strict security rules govern generated packages:',
            ],
            bullets: [
              'Preparation Timeframe: Data compilation takes between 24 hours and 30 calendar days depending on account history size.',
              'Email Dispatch: The download URL is delivered exclusively to the verified email address linked to your account.',
              'Link Expiration: The download link remains active for exactly 30 calendar days from the moment of email dispatch.',
              'Automatic Deletion: Once the 30-day window expires, the generated ZIP archive is permanently purged from our staging servers.',
            ],
          },
        ],
      },
      {
        id: 'legal-and-dpo',
        number: '5',
        title: 'Legal Rights & Data Protection Officer',
        iconName: 'ShieldAlert',
        tldr: 'Under GDPR Article 20 and Ukrainian Law No. 2297-VI, you hold full data portability rights. Contact our DPO in Kyiv, Ukraine for inquiries.',
        subsections: [
          {
            id: 'legal-compliance',
            title: '5.1 Right to Data Portability (GDPR Art. 20 / Law of Ukraine No. 2297-VI)',
            content: [
              'You have the legal right to receive the personal data concerning you in a structured, commonly used, and machine-readable format, and have the right to transmit those data to another controller without hindrance from Eternal Inc.',
              'If you permanently lose access to your account and require your data package for legal proceedings or personal records, you can submit an off-platform verified request to our privacy team.',
            ],
            bullets: [
              'Data Protection Officer (DPO): dpo@eternal.app',
              'Legal & Privacy Inquiries: privacy@eternal.app',
              'Corporate Headquarters: Eternal Inc., Kyiv, Ukraine',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Посібники з безпеки та приватності',
      title: 'Ваш пакет даних Eternal',
      author: 'Команда безпеки Eternal',
      updatedDate: 'Оновлено: 30 серпня 2026 р.',
      followBtn: 'Стежити',
      description:
        'Детальний посібник, що пояснює склад вашого персонального пакета даних Eternal, способи його замовлення на ПК та телефоні, а також правила перегляду експортованих файлів JSON.',
    },
    coversBox: {
      title: 'Зміст статті:',
      items: [
        { id: 'what-is-data-package', label: 'Що таке пакет даних?' },
        {
          id: 'how-to-request',
          label: 'Як запросити пакет даних',
          subItems: [
            { id: 'desktop-browser-guide', label: 'Комп’ютер / Браузер' },
            { id: 'mobile-guide', label: 'Мобільний додаток' },
          ],
        },
        {
          id: 'inside-data-package',
          label: 'Яка інформація міститься всередині?',
          subItems: [
            { id: 'cat-account', label: 'Обліковий запис' },
            { id: 'cat-activity', label: 'Активність' },
            { id: 'cat-activities', label: 'Активності та ігри' },
            { id: 'cat-messages', label: 'Повідомлення' },
            { id: 'cat-servers', label: 'Сервери та канали' },
            { id: 'cat-ads', label: 'Реклама та огляд' },
            { id: 'cat-support', label: 'Запити до підтримки' },
          ],
        },
        { id: 'retention-and-expiration', label: 'Терміни формування та дії посилання' },
        { id: 'legal-and-dpo', label: 'Права на перенесення даних та контакти DPO' },
      ],
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк посібника',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'what-is-data-package',
        number: '1',
        title: 'Що таке пакет даних?',
        iconName: 'Package',
        tldr: 'Пакет даних — це зашифрований ZIP-архів, який містить усі ваші персональні записи, повідомлення та налаштування у форматі JSON.',
        subsections: [
          {
            id: 'data-package-overview',
            title: '1.1 Огляд та формат файлів',
            content: [
              'Пакет даних — це ZIP-архів із файлами, який ви можете запросити через «Налаштування користувача». Він містить усі ваші дані на платформі Eternal: повідомлення, сервери, активність, підключені програми та параметри профілю.',
              'Файли в архіві мають стандартний формат JSON (JavaScript Object Notation). Їх можна відкрити за допомогою звичайного «Блокнота» у Windows, TextEdit на macOS або просто перетягнути у будь-який браузер (Chrome, Firefox, Safari).',
            ],
            tip: 'Порада: Файли JSON зручно переглядати безпосередньо у веб-браузері — ви зможете згортати та розгортати окремі розділи.',
          },
        ],
      },
      {
        id: 'how-to-request',
        number: '2',
        title: 'Як запросити пакет даних',
        iconName: 'Download',
        tldr: 'Замовте архів через Налаштування > Конфіденційність > Запросити дані. Посилання для завантаження надійде на e-mail протягом 30 днів.',
        subsections: [
          {
            id: 'desktop-browser-guide',
            title: '2.1 Запит на комп’ютері або у веб-браузері',
            content: [
              'Покрокова інструкція для замовлення архіву на Windows, macOS, Linux та у веб-версії:',
            ],
            steps: [
              {
                stepNumber: 1,
                title: 'Відкрийте налаштування',
                description:
                  'Натисніть на значок шестерні (⚙️) у нижньому лівому куті біля вашого аватара.',
              },
              {
                stepNumber: 2,
                title: 'Перейдіть у Конфіденційність',
                description:
                  'Виберіть розділ «Конфіденційність» та прокрутіть до блоку «Запросити всі мої дані».',
              },
              {
                stepNumber: 3,
                title: 'Натисніть Запросити дані',
                description:
                  'Натисніть кнопку «Запросити дані», після чого відкриється модальне вікно вибору категорій.',
              },
              {
                stepNumber: 4,
                title: 'Виберіть категорії',
                description:
                  'Позначте галочками потрібні типи інформації (Обліковий запис, Повідомлення, Сервери тощо).',
              },
              {
                stepNumber: 5,
                title: 'Підтвердіть запит',
                description:
                  'Натисніть «Запросити мої дані». Ви отримаєте підтвердження про підготовку архіву протягом 30 днів.',
              },
            ],
            tip: 'Важливо: Якщо ви вимкнете або видалите обліковий запис до отримання посилання, ваш запит буде автоматично скасовано.',
          },
          {
            id: 'mobile-guide',
            title: '2.2 Запит у мобільному додатку (iOS / Android)',
            content: ['Ви також можете запросити архів безпосередньо зі смартфона:'],
            steps: [
              {
                stepNumber: 1,
                title: 'Вкладка профілю',
                description: 'Торкніться свого аватара у правому нижньому куті програми.',
              },
              {
                stepNumber: 2,
                title: 'Налаштування',
                description: 'Натисніть значок шестерні у правому верхньому куті екрана профілю.',
              },
              {
                stepNumber: 3,
                title: 'Конфіденційність',
                description:
                  'Перейдіть у розділ конфіденційності та виберіть «Запросити всі мої дані».',
              },
              {
                stepNumber: 4,
                title: 'Схвалення запиту',
                description: 'Виберіть категорії та підтвердіть замовлення архіву.',
              },
            ],
          },
        ],
      },
      {
        id: 'inside-data-package',
        number: '3',
        title: 'Яка інформація міститься всередині?',
        iconName: 'FolderArchive',
        tldr: 'Архів містить папки: Обліковий запис, Активність, Ігри, Повідомлення, Сервери, Реклама та Звернення до підтримки.',
        subsections: [
          {
            id: 'cat-account',
            title: '3.1 Папка «Обліковий запис» (Account)',
            content: ['Містить усю інформацію про ваш профіль:'],
            bullets: [
              'ID користувача, логін, телефон та підтверджену електронну пошту.',
              'Поточні та попередні аватари й фонові банери.',
              'Налаштування сповіщень, теми оформлення та правила приватності.',
              'Підключені інтеграції (Steam, Spotify, GitHub).',
            ],
          },
          {
            id: 'cat-activity',
            title: '3.2 Папка «Активність» (Activity)',
            content: ['Включає 4 підпапки з технічними даними взаємодії:'],
            bullets: [
              'Analytics: метрики продуктивності для покращення інтерфейсу.',
              'Modeling: параметри інтересів для рекомендацій спільнот.',
              'Reporting: інформація про статус підписок і платежі.',
              'Trust & Safety (TNS): звіти про безпеку та хеші пристроїв (зберігаються до 2 років).',
            ],
          },
          {
            id: 'cat-activities',
            title: '3.3 Папка «Активності та ігри» (Activities)',
            content: [
              'Історія спільних переглядів, результати вбудованих міні-ігор та налаштування активностей.',
            ],
          },
          {
            id: 'cat-messages',
            title: '3.4 Папка «Повідомлення» (Messages)',
            content: [
              'Тексти всіх надісланих вами особистих та публічних повідомлень із мітками часу та посиланнями на вкладення.',
            ],
          },
          {
            id: 'cat-servers',
            title: '3.5 Папка «Сервери» (Servers)',
            content: [
              'Список серверів, де ви є учасником або власником, ваші ролі та налаштовані права доступу.',
            ],
          },
          {
            id: 'cat-ads',
            title: '3.6 Папка «Реклама та огляд» (Ads)',
            content: [
              'Записи взаємодії з партнерськими квестами, рекомендованими серверами та оглядовими стрічками.',
            ],
          },
          {
            id: 'cat-support',
            title: '3.7 Папка «Підтримка» (Support Tickets)',
            content: ['Історія ваших звернень до служби підтримки Eternal та апеляцій з безпеки.'],
          },
        ],
      },
      {
        id: 'retention-and-expiration',
        number: '4',
        title: 'Терміни формування та дії посилання',
        iconName: 'Clock',
        tldr: 'Архів формується до 30 днів. Захищене посилання для завантаження на e-mail діє 30 календарних днів.',
        subsections: [
          {
            id: 'expiration-rules',
            title: '4.1 Правила зберігання та захисту',
            content: ['Для забезпечення максимальної безпеки даних застосовуються такі правила:'],
            bullets: [
              'Час підготовки: від 24 годин до 30 днів залежно від обсягу історії акаунту.',
              'Доставка: посилання надсилається виключно на підтверджену електронну адресу.',
              'Термін дії: посилання залишається активним рівно 30 календарних днів.',
              'Видалення з сервера: після завершення 30 днів сформований ZIP-файл безповоротно видаляється з тимчасового сховища.',
            ],
          },
        ],
      },
      {
        id: 'legal-and-dpo',
        number: '5',
        title: 'Права на перенесення даних та контакти DPO',
        iconName: 'ShieldAlert',
        tldr: 'Згідно зі ст. 20 GDPR та Законом України № 2297-VI, ви маєте право на перенесення даних. Контакти DPO у м. Київ, Україна.',
        subsections: [
          {
            id: 'legal-compliance',
            title: '5.1 Право на перенесення даних (GDPR Art. 20 / Закон України № 2297-VI)',
            content: [
              'Ви маєте законне право отримати всі персональні дані, які ви надали Eternal Inc., у структурованому, загальноприйнятому та машиночитаному форматі, а також передати ці дані іншому контролеру.',
              'Якщо ви втратили доступ до облікового запису та потребуєте копію даних для юридичних цілей, зверніться до нашої служби безпеки:',
            ],
            bullets: [
              'Офіцер із захисту даних (DPO): dpo@eternal.app',
              'Юридичний відділ: privacy@eternal.app',
              'Головний офіс: Eternal Inc., м. Київ, Україна',
            ],
          },
        ],
      },
    ],
  },
};
