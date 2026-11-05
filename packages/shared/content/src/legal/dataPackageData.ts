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
      author: 'Eternal project operators',
      updatedDate: 'Updated November 5, 2026',
      followBtn: 'Follow',
      description:
        'What the current JSON download contains, how to use it, and how to request other personal data.',
    },
    coversBox: {
      title: 'What this article covers:',
      items: [
        {
          id: 'what-is-data-package',
          label: 'What Is A Data Package?',
        },
        {
          id: 'how-to-request',
          label: 'How To Download Your Data',
        },
        {
          id: 'inside-data-package',
          label: 'Included Data and Exclusions',
        },
        {
          id: 'retention-and-expiration',
          label: 'Download Limits and Errors',
        },
        {
          id: 'legal-and-dpo',
          label: 'Your Rights and Contact',
        },
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
        tldr: 'The current download is a JSON file containing a selected subset of your account data. It is not encrypted.',
        subsections: [
          {
            id: 'package-format',
            title: '1.1 File Format',
            content: [
              'The self-service download is a JSON file prepared on your device from authenticated requests. It is not an encrypted ZIP, an email delivery service, or a complete copy of every category of personal data Eternal may hold.',
              'The file contains the selected sections, export timestamps, records, pagination results, and a list of limitations. Keep it private; anyone with access to the file may read its unencrypted contents.',
            ],
          },
        ],
      },
      {
        id: 'how-to-request',
        number: '2',
        title: 'How To Download Your Data',
        iconName: 'Download',
        tldr: 'Sign in, choose categories, enter your current password, and download JSON.',
        subsections: [
          {
            id: 'desktop-browser-guide',
            title: '2.1 Web and Desktop',
            content: [
              'On the Eternal website or desktop app, open profile settings, Privacy, and the data package action. The download action is also available in this guide after signing in.',
              'Choose the categories, enter your current password, and select Download JSON. Password verification is required for each page; your password is not placed in the file. Cancel stops the download process.',
              'In the mobile app, open the data package guide in your browser and sign in there. A native file export is not currently available.',
            ],
          },
        ],
      },
      {
        id: 'inside-data-package',
        number: '3',
        title: 'Included Data and Exclusions',
        iconName: 'FolderArchive',
        tldr: 'Includes selected account details, profile, settings, own posts, own comments, and eligible sent messages.',
        subsections: [
          {
            id: 'included-records',
            title: '3.1 Scope',
            content: [
              'Account: identifiers, email, username, declared birthday, gender, and account timestamps. Profile and settings: selected profile fields, privacy preferences, and notification settings. Posts and comments: your own text records and identifiers.',
              'Messages: only messages sent by you that have not been deleted and that belong to conversations you can currently access. Media attachments are represented only by selected metadata. End-to-end encrypted message bodies remain ciphertext; no decryption keys are exported.',
              'Excluded from this automatic download: media files and download URLs, stories, reels, integrations, relationships, activity histories, devices and sessions, internal logs, reports, moderation records, and messages from conversations you can no longer access. These exclusions describe this tool, not a waiver of your legal rights.',
            ],
          },
        ],
      },
      {
        id: 'retention-and-expiration',
        number: '4',
        title: 'Download Limits and Errors',
        iconName: 'Clock',
        tldr: 'No emailed link or server-hosted archive is created.',
        subsections: [
          {
            id: 'download-limits',
            title: '4.1 Preparation and Limits',
            content: [
              'Preparation begins when you request the download. There is no promised completion time, email link, link-expiry period, or server-hosted ZIP archive. Different sections are read separately and do not represent one atomic snapshot.',
              'Each server response is limited to 100 records and 256 KiB. The browser download stops at 1,000 pages or approximately 25 MiB of page data rather than silently omitting records. A single oversized record or unavailable archived message body may prevent completion.',
              'Rate limits may delay requests. If any selected page fails, the tool does not download a partial file as a successful export. Try fewer categories or contact eternalnet.support@proton.me for help with a larger request.',
            ],
          },
        ],
      },
      {
        id: 'legal-and-dpo',
        number: '5',
        title: 'Your Rights and Contact',
        iconName: 'ShieldAlert',
        tldr: 'For other access, portability, or deletion requests, email eternalnet.support@proton.me.',
        subsections: [
          {
            id: 'rights-contact',
            title: '5.1 Contact the Operators',
            content: [
              'The automatic download does not replace your applicable rights of access, portability, rectification, erasure, objection, or complaint. Contact eternalnet.support@proton.me for information omitted from the tool or assistance exercising your rights.',
              'Eternal is jointly operated by Mykola Agh and Michal Agh, two individuals operating from Ukraine. No DPO appointment has been confirmed. Please describe the request without sending a password, full payment-card number, or identity document. If identity verification is necessary, the operators must request only proportionate information.',
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
      author: 'Оператори проєкту Eternal',
      updatedDate: 'Оновлено 5 листопада 2026 р.',
      followBtn: 'Стежити',
      description:
        'Склад поточного JSON-файлу, порядок завантаження та звернення щодо інших персональних даних.',
    },
    coversBox: {
      title: 'Зміст посібника:',
      items: [
        {
          id: 'what-is-data-package',
          label: 'Що таке пакет даних?',
        },
        {
          id: 'how-to-request',
          label: 'Як завантажити свої дані',
        },
        {
          id: 'inside-data-package',
          label: 'Склад файлу та винятки',
        },
        {
          id: 'retention-and-expiration',
          label: 'Обмеження завантаження та помилки',
        },
        {
          id: 'legal-and-dpo',
          label: 'Ваші права та контакт',
        },
      ],
    },
    toc: {
      contents: 'Зміст',
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
        tldr: 'Наразі завантажується незашифрований JSON-файл з обраною частиною даних облікового запису.',
        subsections: [
          {
            id: 'package-format',
            title: '1.1 Формат файлу',
            content: [
              'Самостійне завантаження — це JSON-файл, підготовлений на вашому пристрої з авторизованих запитів. Це не зашифрований ZIP, не надсилання поштою й не повна копія всіх категорій персональних даних, які може зберігати Eternal.',
              'Файл містить обрані розділи, час експорту, записи, результати сторінок і перелік обмежень. Зберігайте його приватно: кожен, хто отримає файл, зможе прочитати незашифрований вміст.',
            ],
          },
        ],
      },
      {
        id: 'how-to-request',
        number: '2',
        title: 'Як завантажити свої дані',
        iconName: 'Download',
        tldr: 'Увійдіть, оберіть категорії, введіть поточний пароль і завантажте JSON.',
        subsections: [
          {
            id: 'desktop-browser-guide',
            title: '2.1 Сайт і desktop-застосунок',
            content: [
              'На сайті чи в desktop-застосунку Eternal відкрийте налаштування профілю, розділ приватності та дію пакета даних. Завантаження також доступне в цьому посібнику після входу.',
              'Оберіть категорії, введіть поточний пароль і натисніть «Завантажити JSON». Кожна сторінка потребує перевірки пароля; пароль не потрапляє у файл. Скасування зупиняє підготовку.',
              'У мобільному застосунку відкрийте посібник щодо пакета даних у браузері та увійдіть там. Нативне вивантаження файлу наразі недоступне.',
            ],
          },
        ],
      },
      {
        id: 'inside-data-package',
        number: '3',
        title: 'Склад файлу та винятки',
        iconName: 'FolderArchive',
        tldr: 'Доступні обрані дані облікового запису, профіль, налаштування, власні дописи, коментарі й доступні надіслані повідомлення.',
        subsections: [
          {
            id: 'included-records',
            title: '3.1 Межі експорту',
            content: [
              'Обліковий запис: ідентифікатори, пошта, ім’я користувача, заявлена дата народження, стать і часові позначки. Профіль та налаштування: обрані поля профілю, параметри приватності та сповіщень. Дописи й коментарі: власні текстові записи та ідентифікатори.',
              'Повідомлення: лише надіслані вами невидалені повідомлення з розмов, до яких ви наразі маєте доступ. Вкладення представлені лише обраними метаданими. Тексти з наскрізним шифруванням залишаються шифротекстом; ключі розшифрування не експортуються.',
              'До цього автоматичного завантаження не входять медіафайли й посилання на них, історії, рілси, інтеграції, зв’язки, історії активності, пристрої та сеанси, внутрішні журнали, скарги, записи модерації та повідомлення з недоступних розмов. Ці винятки описують інструмент і не скасовують ваших законних прав.',
            ],
          },
        ],
      },
      {
        id: 'retention-and-expiration',
        number: '4',
        title: 'Обмеження завантаження та помилки',
        iconName: 'Clock',
        tldr: 'Поштове посилання та архів на сервері не створюються.',
        subsections: [
          {
            id: 'download-limits',
            title: '4.1 Підготовка та обмеження',
            content: [
              'Підготовка починається після запиту. Немає обіцяного часу завершення, листа з посиланням, строку дії посилання чи ZIP-архіву на сервері. Розділи читаються окремо й не утворюють єдиного атомарного знімка.',
              'Серверна відповідь обмежена 100 записами та 256 КіБ. Завантаження у браузері зупиняється після 1000 сторінок або приблизно 25 МіБ даних сторінок замість прихованого пропуску записів. Завеликий окремий запис чи недоступний архівований текст повідомлення можуть перешкодити завершенню.',
              'Обмеження частоти можуть затримувати запити. Якщо вибрана сторінка не отримана, інструмент не завантажує частковий файл як успішний експорт. Оберіть менше категорій або зверніться на eternalnet.support@proton.me по допомогу з більшим запитом.',
            ],
          },
        ],
      },
      {
        id: 'legal-and-dpo',
        number: '5',
        title: 'Ваші права та контакт',
        iconName: 'ShieldAlert',
        tldr: 'Інші запити на доступ, перенесення чи видалення даних надсилайте на eternalnet.support@proton.me.',
        subsections: [
          {
            id: 'rights-contact',
            title: '5.1 Звернення до операторів',
            content: [
              'Автоматичне завантаження не замінює застосовних прав на доступ, перенесення, виправлення, видалення даних, заперечення чи скаргу. Щодо відсутніх у файлі даних або допомоги з реалізацією прав пишіть на eternalnet.support@proton.me.',
              'Eternal спільно керують Mykola Agh та Michal Agh — дві фізичні особи, які ведуть діяльність з України. Призначення DPO не підтверджено. Опишіть запит без пароля, повного номера платіжної картки чи документа, що посвідчує особу. Якщо перевірка особи необхідна, оператори мають запитувати лише пропорційні відомості.',
            ],
          },
        ],
      },
    ],
  },
};
