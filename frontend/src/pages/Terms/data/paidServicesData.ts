export interface PaidServicesSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface PaidServicesSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: PaidServicesSubsection[];
}

export interface PaidServicesTranslation {
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
  sections: PaidServicesSection[];
}

export const PAID_SERVICES_DATA: Record<'en' | 'uk', PaidServicesTranslation> = {
  en: {
    hero: {
      archivedLink: 'Subscriptions & Billing',
      title: 'PAID SERVICES & REFUND POLICY',
      effectiveDate: 'Effective: September 1, 2026 • Last updated: August 30, 2026',
      lastUpdated: 'Last Updated: August 30, 2026',
      description:
        'These Paid Services Terms govern purchases made on Eternal, including Eternal Premium memberships, creator tips, virtual badges, and digital goods. It explains recurring billing cycles, cancellation procedures, and your statutory refund rights under EU and global consumer protection laws.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'paid-services-overview',
        number: '1',
        title: 'Eternal Premium & Paid Features Overview',
        iconName: 'Crown',
        tldr: 'We offer Eternal Premium subscriptions and creator support. Core messaging and social features remain completely free for all users.',
        subsections: [
          {
            id: 'premium-features',
            title: '1.1 What Eternal Premium Includes',
            content: [
              'Eternal is free to use for visual feeds, direct chats, voice hangouts, and music sharing. Users may choose to purchase optional paid upgrades ("Eternal Premium") to unlock enhanced capabilities:',
            ],
            bullets: [
              'Enhanced 4K 60FPS screen sharing and ultra-low latency voice room priority.',
              'Increased media upload limits (up to 500MB per attachment).',
              'Exclusive animated profile banners, glowing badges, and custom reaction packs.',
              'Multi-account switcher and priority customer support assistance.',
            ],
          },
        ],
      },
      {
        id: 'billing-and-renewals',
        number: '2',
        title: 'Billing, Recurring Subscriptions & Pricing',
        iconName: 'CreditCard',
        tldr: 'Subscriptions renew automatically at your chosen billing interval (monthly or annual). You can cancel at any time in Settings.',
        subsections: [
          {
            id: 'recurring-charges',
            title: '2.1 Automatic Renewal & Payment Methods',
            content: [
              'When you subscribe to Eternal Premium, you authorize Eternal Inc. (or our authorized payment processors such as Stripe, Apple, or Google) to charge your designated payment method on a recurring periodic basis until cancelled.',
              'All subscription fees are billed in advance. Prices are clearly displayed before purchase and include applicable taxes (such as VAT in Europe). We will notify you at least 30 days in advance of any price modifications.',
            ],
          },
          {
            id: 'easy-cancellation',
            title: '2.2 1-Click Subscription Cancellation',
            content: [
              'You may cancel your subscription at any time without fees or penalties via User Settings → Subscriptions → Cancel Subscription.',
              'Upon cancellation, your Premium benefits remain active until the end of your current paid billing period, and no further recurring charges will occur.',
            ],
          },
        ],
      },
      {
        id: 'refund-policy',
        number: '3',
        title: 'Refund Policy & Statutory Withdrawal Rights',
        iconName: 'RefreshCw',
        tldr: 'EU/EEA/UK users have a 14-day statutory right of withdrawal. Mobile purchases via Apple App Store or Google Play follow app store refund processes.',
        subsections: [
          {
            id: 'eu-withdrawal-right',
            title: '3.1 European Union & UK 14-Day Right of Withdrawal',
            content: [
              'If you reside in the European Union, European Economic Area, or United Kingdom, you have the statutory legal right to withdraw from your purchase without giving any reason within fourteen (14) days from the initial transaction date (EU Consumer Rights Directive).',
              'To exercise your right of withdrawal for web purchases, submit a refund request to billing@eternal.app with your account username and invoice ID within the 14-day window.',
            ],
          },
          {
            id: 'app-store-purchases',
            title: '3.2 Mobile Purchases (Apple App Store & Google Play)',
            content: [
              'If you purchased Eternal Premium through the Apple App Store or Google Play Store, the transaction is processed directly by Apple or Google under their respective terms.',
              'To request a refund for iOS purchases, please visit Apple’s official portal at reportaproblem.apple.com. For Android purchases, request refunds via the Google Play Order History portal.',
            ],
          },
          {
            id: 'general-refund-rules',
            title: '3.3 Virtual Goods & Consumables',
            content: [
              'Except as provided by mandatory local consumer protection laws or where our service was provably defective, purchases of one-time consumable digital items (such as virtual tips, server boosts, or temporary event badges) that are immediately credited to your account are non-refundable.',
            ],
          },
        ],
      },
      {
        id: 'creator-monetization',
        number: '4',
        title: 'Creator Monetization & Virtual Tipping',
        iconName: 'HeartHandshake',
        tldr: 'Tips and creator subscriptions support verified creators. Chargeback fraud and money laundering are strictly prohibited.',
        subsections: [
          {
            id: 'creator-terms',
            title: '4.1 Supporting Creators on Eternal',
            content: [
              'Fans may send voluntary tips and purchase creator subscriptions to support their favorite creators on Eternal.',
              'Creators receive payouts in accordance with the Eternal Creator Monetization Schedule, subject to standard platform processing fees and identity verification (KYC/AML compliance).',
            ],
          },
          {
            id: 'chargeback-abuse',
            title: '4.2 Chargebacks & Fraud Prevention',
            content: [
              'Initiating fraudulent chargebacks, using stolen payment cards, or abusing payment dispute mechanisms will result in immediate suspension of account privileges and possible permanent termination.',
            ],
          },
        ],
      },
      {
        id: 'contact-billing',
        number: '5',
        title: 'Billing Support & Inquiries',
        iconName: 'Mail',
        tldr: 'For invoice copies, VAT questions, or refund inquiries, contact our dedicated billing team at billing@eternal.app.',
        subsections: [
          {
            id: 'billing-contacts',
            title: '5.1 Direct Billing Support',
            content: [
              'If you have questions about an unknown charge, need an updated VAT invoice, or require billing assistance, please reach out to:',
            ],
            bullets: [
              'Billing Operations: billing@eternal.app',
              'General Support: support@eternal.app',
              'Legal & Disputes: legal@eternal.app',
              'Company: Eternal Inc., Kyiv, Ukraine',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Підписки та платежі',
      title: 'УМОВИ ПЛАТНИХ ПОСЛУГ ТА ПОВЕРНЕННЯ КОШТІВ',
      effectiveDate: 'Набуття чинності: 1 вересня 2026 р. • Останнє оновлення: 30 серпня 2026 р.',
      lastUpdated: 'Останнє оновлення: 30 серпня 2026 р.',
      description:
        'Ці умови регулюють придбання підписок Eternal Premium, фінансову підтримку авторів (донати), віртуальні бейджі та цифрові товари. Документ визначає порядок автоматичного подовження підписок, скасування та право на повернення коштів згідно з нормами ЄС і законодавством України.',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк умов',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'paid-services-overview',
        number: '1',
        title: 'Огляд Eternal Premium та платних можливостей',
        iconName: 'Crown',
        tldr: 'Eternal Premium — це додаткова підписка для розширених функцій. Основні функції спілкування та стрічки залишаються безкоштовними.',
        subsections: [
          {
            id: 'premium-features',
            title: '1.1 Що входить до Eternal Premium',
            content: [
              'Платформа Eternal є повністю безкоштовною для публікацій, спілкування у чатах, дзвінках та спільного прослуховування музики. Користувачі можуть добровільно придбати Eternal Premium для доступу до переваг:',
            ],
            bullets: [
              'Трансляція екрану в 4K 60FPS та пріоритетна якість зв’язку у голосових кімнатах.',
              'Збільшений ліміт завантаження файлів (до 500 МБ на файл).',
              'Ексклюзивні анімовані банери профілю, сяючі бейджі та унікальні стікери.',
              'Швидке перемикання між акаунтами та пріоритетна підтримка.',
            ],
          },
        ],
      },
      {
        id: 'billing-and-renewals',
        number: '2',
        title: 'Тарифи, автоподовження та скасування підписки',
        iconName: 'CreditCard',
        tldr: 'Підписка подовжується автоматично. Скасувати її можна в будь-який момент у налаштуваннях профілю в 1 клік.',
        subsections: [
          {
            id: 'recurring-charges',
            title: '2.1 Автоматичне списання та ціноутворення',
            content: [
              'При оформленні підписки ви надаєте дозвіл Eternal Inc. (або платіжним операторам Stripe, Apple, Google) здійснювати періодичні списання коштів відповідно до обраного тарифу (щомісячно або щорічно).',
              'Всі ціни зазначаються з урахуванням податків. Про будь-які зміни вартості ми повідомляємо щонайменше за 30 днів до набрання ними чинності.',
            ],
          },
          {
            id: 'easy-cancellation',
            title: '2.2 Скасування підписки в 1 клік',
            content: [
              'Ви можете скасувати підписку будь-коли в меню: Налаштування → Підписки → Скасувати підписку. Переваги залишаться активними до кінця поточного оплаченого періоду.',
            ],
          },
        ],
      },
      {
        id: 'refund-policy',
        number: '3',
        title: 'Політика повернення коштів (Refund Policy)',
        iconName: 'RefreshCw',
        tldr: 'Користувачі в ЄС мають 14-денне право на відмову. Покупки через Apple/Google регулюються правилами магазинів додатків.',
        subsections: [
          {
            id: 'eu-withdrawal-right',
            title: '3.1 14-денне право на відмову для жителів ЄС (Right of Withdrawal)',
            content: [
              'Згідно з Директивою ЄС про права споживачів, користувачі з країн ЄС та Великої Британії мають законне право відмовитися від онлайн-покупки та отримати повне повернення коштів протягом 14 днів з моменту оплати, звернувшись на billing@eternal.app.',
            ],
          },
          {
            id: 'app-store-purchases',
            title: '3.2 Покупки через мобільні магазини (Apple та Google)',
            content: [
              'Оплата через мобільні додатки здійснюється безпосередньо Apple або Google. Для повернення коштів скористайтеся сервісом reportaproblem.apple.com (для iOS) або історією замовлень Google Play.',
            ],
          },
        ],
      },
      {
        id: 'creator-monetization',
        number: '4',
        title: 'Монетизація та підтримка авторів',
        iconName: 'HeartHandshake',
        tldr: 'Донати та платні підписки на авторів допомагають розвивати спільноту. Шахрайські чарджбеки суворо заборонені.',
        subsections: [
          {
            id: 'creator-terms',
            title: '4.1 Фінансова підтримка авторів',
            content: [
              'Користувачі можуть надсилати добровільні донати та оформлювати підписки на улюблених креаторів. Виплати авторам здійснюються після проходження перевірки особи (KYC).',
            ],
          },
        ],
      },
      {
        id: 'contact-billing',
        number: '5',
        title: 'Контакти фінансового відділу',
        iconName: 'Mail',
        tldr: 'З питань рахунків, податкових накладних та повернення коштів пишіть на billing@eternal.app.',
        subsections: [
          {
            id: 'billing-contacts',
            title: '5.1 Зворотний зв’язок',
            content: ['Для вирішення фінансових питань зв’яжіться з нашою службою білінгу:'],
            bullets: [
              'Фінансовий департамент: billing@eternal.app',
              'Служба підтримки: support@eternal.app',
              'Юридичний відділ: legal@eternal.app',
              'Головний офіс: Eternal Inc., м. Київ, Україна',
            ],
          },
        ],
      },
    ],
  },
};
