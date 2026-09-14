export interface PrivacyPrinciple {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface PrivacyPolicyLink {
  id: string;
  title: string;
  href: string;
  badge?: string;
}

export interface PrivacyHubTranslation {
  hero: {
    title: string;
    subtitle: string;
  };
  principlesSection: {
    title: string;
    subtitle: string;
    items: PrivacyPrinciple[];
  };
  productsSection: {
    title: string;
    description: string;
    learnMore: string;
    modalTitle: string;
    modalPoints: string[];
    closeModal: string;
  };
  policiesSection: {
    title: string;
    subtitle: string;
    items: PrivacyPolicyLink[];
  };
}

export const PRIVACY_HUB_DATA: Record<'en' | 'uk', PrivacyHubTranslation> = {
  en: {
    hero: {
      title: 'ETERNAL PRIVACY HUB',
      subtitle: 'Because privacy is an essential part of feeling safe.',
    },
    principlesSection: {
      title: 'OUR PRIVACY PRINCIPLES',
      subtitle:
        'Eternal brings people together, from private groups to large communities. Privacy can vary by space, and we keep you informed about your data with these guiding principles:',
      items: [
        {
          id: 'control',
          title: "You're in control",
          description:
            'Stronger privacy starts with putting you in control of your experience. Whether that’s limiting the information Eternal collects about you, or deciding who can chat with you or what content you see, it’s up to you.',
          icon: '/images/safety/gamepad-3d.png',
        },
        {
          id: 'not-product',
          title: "You're not the product",
          description:
            'We don’t sell your personal information. Our business is based on subscriptions and paid products, not from selling your personal information to third parties. Know that on Eternal, what’s yours is yours.',
          icon: '/images/safety/not-for-sale-3d.png',
        },
        {
          id: 'transparency',
          title: 'Less data, more transparency',
          description:
            'We want you to always have a clear understanding of what’s happening with your personal information on Eternal, whether that’s through our Privacy Policy, in the app, or right here on our site. When your data is no longer needed, we anonymize it, aggregate it, or delete it. And we make third-party integrations play by the same rules.',
          icon: '/images/safety/analytics-doc-3d.png',
        },
        {
          id: 'responsibility',
          title: 'With data comes great responsibility',
          description:
            'Collecting, storing, and using any kind of data is a big deal and we don’t take it lightly. Your information is only private if it’s secure, and we invest heavily in securing our systems. We believe it’s important to build both privacy protective measures into our architecture and features everyone can use to stay both safe and private.',
          icon: '/images/safety/sword-stone-3d.png',
        },
      ],
    },
    productsSection: {
      title: 'PRIVACY PRESERVING PRODUCTS',
      description:
        'We approach everything we make with privacy principles in mind from the very start, take extra measures to keep you safe, and put you in control of your experience with privacy settings.',
      learnMore: 'Learn More',
      modalTitle: 'Privacy-First Architecture at Eternal',
      modalPoints: [
        'End-to-end encrypted direct messaging and ephemeral message self-destruction options.',
        'Zero ad-tracking telemetry — your conversations are never scanned to build advertising profiles.',
        'Granular privacy toggles for voice activity, status broadcasts, and third-party app permissions.',
        'Automated data scrubbing and one-click data export packages available anytime.',
      ],
      closeModal: 'Close',
    },
    policiesSection: {
      title: 'PRIVACY POLICIES',
      subtitle:
        'Our Privacy Policies go into all the details about how we collect, use, store, protect, and share your personal information.',
      items: [
        {
          id: 'applicant-privacy',
          title: 'Applicant and Candidate Privacy Policy',
          href: '/terms/applicant-candidate-privacy-policy',
        },
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          href: '/privacy',
        },
        {
          id: 'cookie-policy',
          title: 'Cookie Policy',
          href: '/terms/cookie-policy',
        },
        {
          id: 'regional-privacy',
          title: 'Regional Privacy Policies',
          href: '/terms/local-laws',
        },
        {
          id: 'terms-of-service',
          title: 'Terms of Service',
          href: '/terms',
        },
        {
          id: 'retention-policy',
          title: 'Retention Policy',
          href: '/terms/retention-policy',
        },
        {
          id: 'data-privacy-controls',
          title: 'Data Privacy Controls',
          href: '/terms/data-privacy-controls',
        },
        {
          id: 'eternal-data-package',
          title: 'Eternal Data Package',
          href: '/terms/your-eternal-data-package',
        },
      ],
    },
  },
  uk: {
    hero: {
      title: 'ХАБ КОНФІДЕНЦІЙНОСТІ ETERNAL',
      subtitle: 'Оскільки конфіденційність є невід’ємною частиною відчуття безпеки.',
    },
    principlesSection: {
      title: 'НАШІ ПРИНЦИПИ КОНФІДЕНЦІЙНОСТІ',
      subtitle:
        'Eternal об’єднує людей — від затишних приватних груп до великих спільнот. Рівень конфіденційності може відрізнятися залежно від простору, і ми керуємося цими принципами:',
      items: [
        {
          id: 'control',
          title: 'Ви все контролюєте',
          description:
            'Надійний захист починається з повного контролю над вашим простором. Ви самі вирішуєте, яку інформацію Eternal може збирати, хто може писати вам і який контент ви хочете бачити.',
          icon: '/images/safety/gamepad-3d.png',
        },
        {
          id: 'not-product',
          title: 'Ви не є товаром',
          description:
            'Ми ніколи не продаємо вашу особисту інформацію. Наша бізнес-модель будується на преміум-підписках та корисних платних функціях, а не на продажу приватних даних рекламодавцям. Усе ваше залишається вашим.',
          icon: '/images/safety/not-for-sale-3d.png',
        },
        {
          id: 'transparency',
          title: 'Менше даних, більше прозорості',
          description:
            'Ми прагнемо, щоб ви завжди чітко розуміли, що відбувається з вашими даними на Eternal — через Політику конфіденційності, у додатку або на цьому сайті. Коли дані більше не потрібні, ми їх анонімізуємо, агрегуємо або видаляємо.',
          icon: '/images/safety/analytics-doc-3d.png',
        },
        {
          id: 'responsibility',
          title: 'З даними приходить велика відповідальність',
          description:
            'Збір, зберігання та використання будь-яких даних — це величезна відповідальність, і ми ставимося до неї з усією серйозністю. Ваша інформація є приватною лише тоді, коли вона захищена, тому ми постійно інвестуємо в безпеку інфраструктури.',
          icon: '/images/safety/sword-stone-3d.png',
        },
      ],
    },
    productsSection: {
      title: 'ПРОДУКТИ ДЛЯ ЗБЕРЕЖЕННЯ КОНФІДЕНЦІЙНОСТІ',
      description:
        'Ми створюємо всі наші функції з думкою про конфіденційність від самого початку, застосовуємо додаткові заходи безпеки та надаємо вам повний контроль за допомогою налаштувань.',
      learnMore: 'Дізнатися більше',
      modalTitle: 'Архітектура Privacy-First в Eternal',
      modalPoints: [
        'Наскрізне шифрування особистих повідомлень та можливість увімкнути самознищення чатів.',
        'Повна відсутність рекламних трекерів — ваші листування ніколи не скануються для таргетингу.',
        'Гнучкі перемикачі конфіденційності для голосової активності, статусів та сторонніх додатків.',
        'Автоматичне очищення застарілих логів та експорт власного архіву даних в один клік.',
      ],
      closeModal: 'Закрити',
    },
    policiesSection: {
      title: 'ПОЛІТИКИ ТА ПРАВИЛА',
      subtitle:
        'Наші офіційні правила докладно описують, як ми збираємо, використовуємо, зберігаємо, захищаємо та передаємо ваші персональні дані.',
      items: [
        {
          id: 'applicant-privacy',
          title: 'Політика конфіденційності для кандидатів',
          href: '/terms/applicant-candidate-privacy-policy',
        },
        {
          id: 'privacy-policy',
          title: 'Політика конфіденційності',
          href: '/privacy',
        },
        {
          id: 'cookie-policy',
          title: 'Політика використання файлів Cookie',
          href: '/terms/cookie-policy',
        },
        {
          id: 'regional-privacy',
          title: 'Регіональні політики конфіденційності',
          href: '/terms/local-laws',
        },
        {
          id: 'terms-of-service',
          title: 'Умови використання сервісу',
          href: '/terms',
        },
        {
          id: 'retention-policy',
          title: 'Політика зберігання та видалення даних',
          href: '/terms/retention-policy',
        },
        {
          id: 'data-privacy-controls',
          title: 'Елементи керування конфіденційністю',
          href: '/terms/data-privacy-controls',
        },
        {
          id: 'eternal-data-package',
          title: 'Пакет завантаження даних Eternal',
          href: '/terms/your-eternal-data-package',
        },
      ],
    },
  },
};
