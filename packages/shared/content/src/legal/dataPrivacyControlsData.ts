export interface ControlSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface ControlSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: ControlSubsection[];
}

export interface PrivacyControlsTranslation {
  hero: {
    archivedLink: string;
    title: string;
    effectiveDate: string;
    lastUpdated: string;
    description: string;
    locationNote: string;
  };
  interactiveGuide: {
    badge: string;
    title: string;
    subtitle: string;
    autoPlay: string;
    pause: string;
    reset: string;
  };
  toc: {
    contents: string;
    readProgress: string;
    print: string;
    backToTop: string;
  };
  sections: ControlSection[];
}

export const DATA_PRIVACY_CONTROLS_DATA: Record<'en' | 'uk', PrivacyControlsTranslation> = {
  en: {
    hero: {
      archivedLink: 'Archived Versions',
      title: 'DATA PRIVACY CONTROLS',
      effectiveDate: 'Effective: September 1, 2026 • Last updated: August 30, 2026',
      lastUpdated: 'Last Updated: August 30, 2026',
      description:
        'Eternal’s Data Privacy Controls explain how your personal information is used and provide granular options to manage who can see your profile, communicate with you, and how Eternal processes your data.',
      locationNote:
        'These settings can be found in the app under User Settings > Privacy > Profile Privacy & Data Controls.',
    },
    interactiveGuide: {
      badge: 'Interactive Visual Guide',
      title: 'Interactive Privacy Controls Demonstration',
      subtitle:
        'Explore how individual privacy toggles, profile visibility dimensions, and data processing controls work in Eternal. Click any switch below to toggle its state.',
      autoPlay: 'Auto-Play Walkthrough',
      pause: 'Pause Animation',
      reset: 'Reset Defaults',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'accessing-privacy-controls',
        number: '1',
        title: 'Accessing Your Privacy Controls',
        iconName: 'Sliders',
        tldr: 'Navigate to User Settings by clicking the gear icon next to your avatar, then select the Privacy tab.',
        subsections: [
          {
            id: 'settings-navigation-steps',
            title: '1.1 How to Find Privacy Settings in Eternal',
            content: [
              'All personal data controls are centralized within your user settings menu across web, desktop, and mobile platforms:',
            ],
            bullets: [
              'Click your User Avatar or the Settings Gear icon in the bottom-left sidebar of the app.',
              'Select the "Privacy" category from the settings menu.',
              'Choose "Profile Privacy" to configure who can view your profile and contact you.',
              'Access "Data & Telemetry" to manage data processing options, personalization, and export requests.',
            ],
          },
        ],
      },
      {
        id: 'profile-visibility-dimensions',
        number: '2',
        title: 'Profile Visibility & Communication Dimensions',
        iconName: 'Eye',
        tldr: 'Customize 10 individual dimensions (Last Seen, Photo, Messages, Calls, Invites) with Everybody, My Contacts, or Nobody rules.',
        subsections: [
          {
            id: 'dimension-breakdown',
            title: '2.1 Granular Dimension Controls',
            content: [
              'Eternal provides independent privacy rules for every aspect of your account:',
            ],
            bullets: [
              'Last Seen & Online Status: Control who sees your active presence timestamp.',
              'Profile Photo & Banner: Limit visibility of your custom avatar and header banner.',
              'About & Bio: Protect personal description details from public discovery.',
              'Birthday: Choose whether your birthday is visible to everyone, contacts only, or hidden.',
              'Direct Messages & Calls: Restrict incoming direct messages and voice calls to verified contacts.',
              'Voice Messages & Media: Control who can send ephemeral voice notes or forward your messages.',
              'Group Invites: Prevent unwanted invitations to public groups or community servers.',
            ],
          },
        ],
      },
      {
        id: 'account-privacy-modes',
        number: '3',
        title: 'Account Privacy Modes & Discovery',
        iconName: 'Shield',
        tldr: 'Enable Private Account mode to require follow approval, or toggle Nearby Discovery to stay invisible on local radars.',
        subsections: [
          {
            id: 'private-account-mode',
            title: '3.1 Private Account & Follow Requests',
            content: ['When you enable "Private Account" mode:'],
            bullets: [
              'Only approved followers can view your profile details, media uploads, and story updates.',
              'New users must submit a Follow Request, which you can review, approve, or decline from the Follow Requests panel.',
              'Your posts will not appear in global explore or hashtag discovery algorithms.',
            ],
          },
          {
            id: 'nearby-discovery',
            title: '3.2 Recommendations & Nearby Radar',
            content: [
              'You can toggle off recommendation algorithms and location-based discovery to prevent your profile from being suggested to mutual acquaintances or nearby users.',
            ],
          },
        ],
      },
      {
        id: 'data-processing-toggles',
        number: '4',
        title: 'Data Processing & Personalization Toggles',
        iconName: 'Cpu',
        tldr: 'Opt out of optional product improvement telemetry, personalized content recommendations, and third-party rich presence integrations.',
        subsections: [
          {
            id: 'telemetry-options',
            title: '4.1 How Eternal Uses Your Data',
            content: ['Eternal allows you to fine-tune back-end data usage:'],
            bullets: [
              'Use data to improve Eternal: Toggles anonymous performance and crash diagnostic reporting.',
              'Personalized Content: Allows or disables algorithmic sorting in your community explore feeds.',
              'Third-Party Integrations: Controls whether linked apps (Spotify, Steam, GitHub) broadcast your live activity status to server channels.',
              'AI Assistance Opt-Out: Allows you to disable AI-assisted summary and automated moderation features on your account.',
            ],
          },
        ],
      },
      {
        id: 'requesting-data-package',
        number: '5',
        title: 'Requesting Your Complete Data Package',
        iconName: 'Download',
        tldr: 'Request an automated, machine-readable JSON archive containing your full message history, profile records, and server logs.',
        subsections: [
          {
            id: 'data-export-process',
            title: '5.1 Automated Data Portability',
            content: [
              'Pursuant to GDPR Article 20 and CCPA guidelines, you can request an automated archive of all personal data held by Eternal:',
            ],
            bullets: [
              'Click "Request All of My Data" under Data & Privacy controls.',
              'A secure verification email will be dispatched to confirm your identity.',
              'Our automated pipeline compiles a structured JSON and media archive within 24–48 hours.',
              'A download link with 7-day expiration will be sent directly to your verified inbox.',
            ],
          },
        ],
      },
      {
        id: 'contacts-and-dpo',
        number: '6',
        title: 'Questions and Data Protection Officer',
        iconName: 'Mail',
        tldr: 'For privacy inquiries, technical assistance, or dispute resolution, contact our Data Protection Officer in Kyiv, Ukraine.',
        subsections: [
          {
            id: 'dpo-contact-info',
            title: '6.1 Direct Contact Channels',
            content: [
              'If you need assistance configuring your privacy settings or have questions regarding our data practices, reach out to our team:',
            ],
            bullets: [
              'Data Protection Officer (DPO): aghnikolaj1@gmail.com',
              'Privacy & Legal Operations: privacy@eternal.com',
              'Project operators: Ag Mykola and Ag Mihal, Ukraine',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Архівні версії',
      title: 'ЕЛЕМЕНТИ КЕРУВАННЯ КОНФІДЕНЦІЙНІСТЮ',
      effectiveDate: 'Набуття чинності: 1 вересня 2026 р. • Останнє оновлення: 30 серпня 2026 р.',
      lastUpdated: 'Останнє оновлення: 30 серпня 2026 р.',
      description:
        'Елементи керування конфіденційністю Eternal пояснюють, як використовуються ваші персональні дані, та надають детальні налаштування для керування видимістю профілю, спілкуванням і способами обробки інформації.',
      locationNote:
        'Ці параметри доступні у додатку: Налаштування користувача > Конфіденційність > Приватність профілю.',
    },
    interactiveGuide: {
      badge: 'Інтерактивне візуальне керівництво',
      title: 'Інтерактивна демонстрація налаштувань приватності',
      subtitle:
        'Спробуйте в реальному часі, як працюють перемикачі приватності профілю та параметри обробки даних у Eternal. Натисніть на будь-який тумблер для зміни його стану.',
      autoPlay: 'Автоматичний показ',
      pause: 'Пауза',
      reset: 'Скинути налаштування',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк документа',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'accessing-privacy-controls',
        number: '1',
        title: 'Доступ до налаштувань конфіденційності',
        iconName: 'Sliders',
        tldr: 'Перейдіть у «Налаштування користувача», натиснувши шестерню біля аватара, та виберіть розділ «Конфіденційність».',
        subsections: [
          {
            id: 'settings-navigation-steps',
            title: '1.1 Як знайти налаштування приватності в Eternal',
            content: [
              'Всі елементи керування персональними даними зібрані у єдиному центрі налаштувань:',
            ],
            bullets: [
              'Натисніть на свій аватар або іконку шестерні у нижньому лівому куті програми.',
              'Виберіть розділ «Конфіденційність» у списку ліворуч.',
              'Перейдіть у «Приватність профілю» для налаштування видимості контактних даних.',
              'Відкрийте «Дані та аналітика» для керування персоналізацією та вивантаженням архіву.',
            ],
          },
        ],
      },
      {
        id: 'profile-visibility-dimensions',
        number: '2',
        title: 'Параметри видимості профілю та спілкування',
        iconName: 'Eye',
        tldr: 'Налаштуйте 10 окремих параметрів (час останнього візиту, фото, повідомлення, дзвінки) з правилами «Всі», «Мої контакти» або «Ніхто».',
        subsections: [
          {
            id: 'dimension-breakdown',
            title: '2.1 Детальні параметри доступу',
            content: [
              'Eternal надає незалежний контроль для кожного елемента вашого облікового запису:',
            ],
            bullets: [
              'Час останнього візиту та статус: вибір кола осіб, які бачать вашу активність.',
              'Фото та банер профілю: обмеження видимості медіафайлів профілю.',
              'Про себе: приховування тексту біографії від незнайомих користувачів.',
              'День народження: показ дати народження лише перевіреним контактам.',
              'Повідомлення та дзвінки: захист від небажаних особистих дзвінків і повідомлень.',
              'Голосові повідомлення: контроль надсилання аудіозаписів.',
              'Запрошення до груп: блокування масових запрошень на сторонні сервери.',
            ],
          },
        ],
      },
      {
        id: 'account-privacy-modes',
        number: '3',
        title: 'Режими приватності акаунту та рекомендації',
        iconName: 'Shield',
        tldr: 'Увімкніть «Приватний акаунт» для обов’язкового схвалення підписників або вимкніть рекомендації для повної конфіденційності.',
        subsections: [
          {
            id: 'private-account-mode',
            title: '3.1 Приватний акаунт та запити на підписку',
            content: ['При увімкненні режиму «Приватний акаунт»:'],
            bullets: [
              'Лише схвалені вами підписники можуть переглядати публікації та активність.',
              'Нові користувачі надсилають запит, який ви можете схвалити або відхилити.',
              'Ваш профіль не з’являється у глобальних рекомендаціях та пошуку.',
            ],
          },
        ],
      },
      {
        id: 'data-processing-toggles',
        number: '4',
        title: 'Тумблери обробки даних та персоналізації',
        iconName: 'Cpu',
        tldr: 'Вимикайте збір необов’язкової аналітики, персоналізовані стрічки та трансляцію статусу сторонніх додатків.',
        subsections: [
          {
            id: 'telemetry-options',
            title: '4.1 Як Eternal використовує ваші дані',
            content: ['Ви можете самостійно вимкнути додаткову обробку даних:'],
            bullets: [
              'Покращення Eternal: вимкнення анонімних звітів про збої.',
              'Персоналізація контенту: вимкнення алгоритмічного підбору стрічки.',
              'Інтеграції (Spotify, Steam, GitHub): вимкнення трансляції активності у серверах.',
              'Відмова від інструментів ШІ: вимкнення автоматизованого аналізу повідомлень.',
            ],
          },
        ],
      },
      {
        id: 'requesting-data-package',
        number: '5',
        title: 'Запит повного пакета персональних даних',
        iconName: 'Download',
        tldr: 'Отримайте повний структурований JSON-архів своєї історії повідомлень, профілю та налаштувань.',
        subsections: [
          {
            id: 'data-export-process',
            title: '5.1 Процес вивантаження даних',
            content: ['Відповідно до ст. 20 GDPR та законів про переносність даних:'],
            bullets: [
              'Натисніть кнопку «Запросити всі мої дані» в розділі конфіденційності.',
              'Підтвердьте запит через лист безпеки на електронній пошті.',
              'Система сформує зашифрований архів протягом 24–48 годин.',
              'Посилання для завантаження діє 7 календарних днів.',
            ],
          },
        ],
      },
      {
        id: 'contacts-and-dpo',
        number: '6',
        title: 'Контакти Офіцера із захисту даних',
        iconName: 'Mail',
        tldr: 'З усіх питань налаштування приватності звертайтеся до нашого DPO в м. Київ, Україна.',
        subsections: [
          {
            id: 'dpo-contact-info',
            title: '6.1 Контактні канали',
            content: ['З усіх питань щодо налаштувань конфіденційності звертайтеся:'],
            bullets: [
              'Офіцер із захисту даних (DPO): aghnikolaj1@gmail.com',
              'Юридичний відділ: privacy@eternal.com',
              'Оператори проєкту: Ag Mykola та Ag Mihal, Україна',
            ],
          },
        ],
      },
    ],
  },
};
