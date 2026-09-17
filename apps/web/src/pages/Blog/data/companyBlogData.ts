import { BlogPost } from './blogData';

export interface CompanyBlogCategoryData {
  title: string;
  subtitle: string;
  heroArticle: BlogPost;
  featuredPosts: BlogPost[];
  explorePosts: BlogPost[];
  categoryName: string;
}

export const COMPANY_BLOG_DATA_EN: CompanyBlogCategoryData = {
  title: 'ETERNAL HQ',
  subtitle: 'General company updates about what Eternal is up to at HQ.',
  categoryName: 'Eternal HQ',
  heroArticle: {
    id: 'company-founders-circle',
    category: 'Eternal HQ',
    date: 'Aug 29, 2026',
    readTime: '5 min read',
    title: 'SCALING THE SOCIAL FRONTIER: ETERNAL BACKS NEXT-GEN INDIE CREATORS & DEVELOPERS',
    subtitle:
      'Together with our global ecosystem partners, we are launching the Eternal Founders Circle: a hands-on accelerator providing independent teams with direct mentorship, platform grants, and low-latency infrastructure.',
    description:
      'Our mission is to foster open, privacy-respecting online spaces. This new initiative empowers visionary founders building next-generation social tools, games, and community plugins.',
    gradientClass: 'from-[#1e1045] via-[#12082b] to-[#07050f]',
    previewType: 'company-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'company-celebration-pack',
      category: 'Eternal HQ',
      date: 'Aug 26, 2026',
      readTime: '3 min read',
      title: "Celebrate Eternal's Milestone with Exclusive Brand Stickers & Wallpapers",
      description:
        'A special collection of handcrafted 4K desktop wallpapers, animated custom reaction packs, and commemorative avatars for our early supporters.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'company-birthday' as any,
      isFeatured: true,
    },
    {
      id: 'company-open-architecture',
      category: 'Eternal HQ',
      date: 'Aug 21, 2026',
      readTime: '4 min read',
      title: 'Our Open Architecture: Why We Bet on Decentralized State & Real-Time Sync',
      description:
        'A deep dive into our core networking layer: WebSocket event streaming, conflict-free replicated data types, and sub-50ms message propagation.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'company-architecture' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'company-design-system',
      category: 'Eternal HQ',
      date: 'Aug 15, 2026',
      readTime: '4 min read',
      title: 'Behind the Brand: Designing the Eternal Design System 2.0',
      description:
        'How our design team crafted fluid dark interfaces, tactile micro-animations, and harmonious contrast ratios for maximum focus.',
      gradientClass: 'from-fuchsia-900 via-purple-950 to-[#07050f]',
      previewType: 'company-designsystem' as any,
    },
    {
      id: 'company-audit-report',
      category: 'Eternal HQ',
      date: 'Aug 08, 2026',
      readTime: '3 min read',
      title: 'Zero Telemetry Transparency: Annual Infrastructure Safety Audit',
      description:
        'Independent security researchers verify Eternal’s client encryption standards, audit telemetry absence, and validate data isolation policies.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'company-audit' as any,
    },
    {
      id: 'company-remote-culture',
      category: 'Eternal HQ',
      date: 'Jul 30, 2026',
      readTime: '3 min read',
      title: 'Meet the Core Team: Engineering Culture & Remote-First Collaboration',
      description:
        'How distributed engineers across 12 timezones ship daily updates with async communication, high autonomy, and shared ownership.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'company-team' as any,
    },
    {
      id: 'company-education-initiatives',
      category: 'Eternal HQ',
      date: 'Jul 22, 2026',
      readTime: '3 min read',
      title: 'Eternal for Education: Bringing Collaborative Hubs to 100+ Universities',
      description:
        'Free verified community tiers, group voice study rooms, and campus discussion boards for research labs and student organizations.',
      gradientClass: 'from-cyan-900 via-blue-950 to-[#07050f]',
      previewType: 'community-students' as any,
    },
    {
      id: 'company-indie-devs',
      category: 'Eternal HQ',
      date: 'Jul 15, 2026',
      readTime: '4 min read',
      title: 'Ecosystem Ventures: How We Support Grassroots Indie Game Developers',
      description:
        'Providing developer toolkits, rich presence APIs, and in-game voice overlays for independent gaming studios.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'community-gaming' as any,
    },
    {
      id: 'company-sustainability',
      category: 'Eternal HQ',
      date: 'Jul 04, 2026',
      readTime: '3 min read',
      title: 'Sustainability at Scale: Carbon-Neutral Cloud Infrastructure by 2027',
      description:
        'Optimizing data center thermal efficiency, green energy routing, and compute workload density for eco-friendly operations.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'company-sustainability' as any,
    },
  ],
};

export const COMPANY_BLOG_DATA_UK: CompanyBlogCategoryData = {
  title: 'ETERNAL HQ',
  subtitle: 'Загальні новини компанії та оновлення з головного офісу Eternal.',
  categoryName: 'Eternal HQ',
  heroArticle: {
    id: 'company-founders-circle',
    category: 'Eternal HQ',
    date: '29 серп. 2026',
    readTime: '5 хв читання',
    title: 'РОЗШИРЕННЯ СОЦІАЛЬНИХ ГОРИЗОНТІВ: ETERNAL ПІДТРИМУЄ НЕЗАЛЕЖНИХ АВТОРІВ ТА РОЗРОБНИКІВ',
    subtitle:
      'Разом із нашими міжнародними партнерами ми запускаємо програму Eternal Founders Circle: акселератор для надання індивідуального менторства, грантів та швидкої інфраструктури.',
    description:
      'Наша мета — створення відкритих цифрових просторів із повагою до приватності. Ця ініціатива допомагає розробникам ігрових студій, інструментів та плагінів спільноти.',
    gradientClass: 'from-[#1e1045] via-[#12082b] to-[#07050f]',
    previewType: 'company-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'company-celebration-pack',
      category: 'Eternal HQ',
      date: '26 серп. 2026',
      readTime: '3 хв читання',
      title: 'Святкуйте досягнення Eternal: Ексклюзивний набір стікерів та шпалер',
      description:
        'Спеціальна колекція 4K шпалер для робочого столу, анімовані реакції та пам’ятні аватари для наших перших користувачів.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'company-birthday' as any,
      isFeatured: true,
    },
    {
      id: 'company-open-architecture',
      category: 'Eternal HQ',
      date: '21 серп. 2026',
      readTime: '4 хв читання',
      title: 'Наша відкрита архітектура: Чому ми обрали децентралізовану синхронізацію',
      description:
        'Огляд нашого мережевого шару: потокові WebSocket події, безконфліктні типи даних CRDT та доставка повідомлень менш ніж за 50 мс.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'company-architecture' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'company-design-system',
      category: 'Eternal HQ',
      date: '15 серп. 2026',
      readTime: '4 хв читання',
      title: 'За лаштунками бренду: Створення Eternal Design System 2.0',
      description:
        'Як наша команда дизайнерів розробляла плавний темний інтерфейс, мікроанімації та гармонійний контраст для комфорту очей.',
      gradientClass: 'from-fuchsia-900 via-purple-950 to-[#07050f]',
      previewType: 'company-designsystem' as any,
    },
    {
      id: 'company-audit-report',
      category: 'Eternal HQ',
      date: '08 серп. 2026',
      readTime: '3 хв читання',
      title: 'Прозорість без телеметрії: Щорічний аудит безпеки інфраструктури',
      description:
        'Незалежні експерти з кібербезпеки підтвердили відсутність прихованого трекінгу та високий рівень захисту даних користувачів.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'company-audit' as any,
    },
    {
      id: 'company-remote-culture',
      category: 'Eternal HQ',
      date: '30 лип. 2026',
      readTime: '3 хв читання',
      title: 'Познайомтеся з командою: Інженерна культура та віддалена робота',
      description:
        'Як інженери з 12 часових поясів випускають щоденні оновлення завдяки асинхронній комунікації та високій автономності.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'company-team' as any,
    },
    {
      id: 'company-education-initiatives',
      category: 'Eternal HQ',
      date: '22 лип. 2026',
      readTime: '3 хв читання',
      title: 'Eternal для освіти: Спільні простори для понад 100 університетів',
      description:
        'Безкоштовні верифіковані тарифи для студентських організацій, голосові кімнати для навчання та спільні дошки.',
      gradientClass: 'from-cyan-900 via-blue-950 to-[#07050f]',
      previewType: 'community-students' as any,
    },
    {
      id: 'company-indie-devs',
      category: 'Eternal HQ',
      date: '15 лип. 2026',
      readTime: '4 хв читання',
      title: 'Підтримка інді-розробників: Інструменти та API для ігрових студій',
      description:
        'Надання SDK, оверлеїв голосового зв’язку та систем присутності для незалежних розробників відеоігор.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'community-gaming' as any,
    },
    {
      id: 'company-sustainability',
      category: 'Eternal HQ',
      date: '04 лип. 2026',
      readTime: '3 хв читання',
      title: 'Екологічна стійкість: Перехід на вуглецево-нейтральні дата-центри до 2027',
      description:
        'Оптимізація енергоефективності серверів та використання зеленої енергії для збереження довкілля.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'company-sustainability' as any,
    },
  ],
};

export const COMPANY_BLOG_TRANSLATIONS: Record<string, CompanyBlogCategoryData> = {
  English: COMPANY_BLOG_DATA_EN,
  Українська: COMPANY_BLOG_DATA_UK,
  Deutsch: COMPANY_BLOG_DATA_EN,
  Español: COMPANY_BLOG_DATA_EN,
  Français: COMPANY_BLOG_DATA_EN,
};
