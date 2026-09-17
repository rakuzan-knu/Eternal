export interface BlogPost {
  id: string;
  category: string;
  date: string;
  readTime: string;
  title: string;
  subtitle?: string;
  description: string;
  author?: string;
  gradientClass?: string;
  isFeatured?: boolean;
  previewType:
    | 'hero-letter'
    | 'messenger'
    | 'themes'
    | 'stories'
    | 'voice-video'
    | 'feed'
    | 'patch-notes'
    | 'genesis'
    | 'transparency'
    | 'community-hero'
    | 'community-spotlight'
    | 'community-music'
    | 'community-mods'
    | 'community-gaming'
    | 'community-students'
    | 'community-opensource'
    | 'community-grants'
    | 'community-wellness'
    | 'company-hero'
    | 'company-birthday'
    | 'company-architecture'
    | 'company-designsystem'
    | 'company-audit'
    | 'company-team'
    | 'company-sustainability'
    | 'engineering-hero'
    | 'engineering-rust'
    | 'engineering-sdk'
    | 'engineering-bot'
    | 'engineering-jitter'
    | 'engineering-verified'
    | 'engineering-wasm'
    | 'engineering-migrations'
    | 'engineering-e2e'
    | 'howto-hero'
    | 'howto-themes'
    | 'howto-display'
    | 'howto-emojis'
    | 'howto-presence'
    | 'howto-audio'
    | 'howto-guild'
    | 'howto-storage'
    | 'howto-2fa'
    | 'safety-hero'
    | 'safety-assurance'
    | 'safety-guardian'
    | 'safety-wellbeing'
    | 'safety-transparency'
    | 'safety-matrix'
    | 'safety-youth'
    | 'safety-genz'
    | 'safety-antiraid'
    | 'product-hero'
    | 'product-changelog-aug'
    | 'product-ai-assistant'
    | 'product-patch-july'
    | 'product-spatial-vr'
    | 'product-changelog-june'
    | 'product-soundboard'
    | 'product-4k-stream'
    | 'product-handoff';
}

export interface BlogTranslations {
  heroHeading: string;
  featuredCategory: string;
  allCategory: string;
  productCategory: string;
  policyCategory: string;
  engineeringCategory: string;
  companyCategory: string;
  communityCategory: string;
  searchPlaceholder: string;
  exploreFurtherHeading: string;
  exploreFurtherSubtitle: string;
  loadMoreButton: string;
  noResultsFound: string;
  heroArticle: BlogPost;
  featuredPosts: BlogPost[];
  explorePosts: BlogPost[];
}

export const HERO_ARTICLE_EN: BlogPost = {
  id: 'hero-letter-community',
  category: 'Company HQ',
  date: 'Aug 29, 2026',
  readTime: '5 min read',
  title: 'A LETTER TO THE ETERNAL COMMUNITY',
  subtitle:
    'On our commitment to building an open, privacy-first social ecosystem with uncompromising performance, transparent governance, and true user ownership.',
  description:
    'As Eternal grows to empower communities across the globe, we are reaffirming our foundational principles: no tracking algorithms that manipulate user attention, zero hidden telemetry, and an open platform designed for real human connection.',
  author: 'Nikolaj, Founder & Lead Architect',
  gradientClass: 'from-[#3b1a80] via-[#240e5c] to-[#07050f]',
  previewType: 'hero-letter',
  isFeatured: true,
};

export const FEATURED_POSTS_EN: BlogPost[] = [
  {
    id: 'post-messenger-launch',
    category: 'Product & Features',
    date: 'Aug 25, 2026',
    readTime: '4 min read',
    title: 'Next-Gen Communication: The Launch of Eternal Messenger',
    description:
      'Engineered with WebSockets and WebRTC for zero-latency instant messaging, crisp voice rooms, and crystal-clear screen broadcasts.',
    gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
    previewType: 'messenger',
    isFeatured: true,
  },
  {
    id: 'post-chat-themes',
    category: 'Product & Features',
    date: 'Aug 20, 2026',
    readTime: '3 min read',
    title: 'Express Yourself: Custom Liquid Chat Themes & Gradients',
    description:
      'Personalize direct messages and squad lounges with tailored liquid color gradients, glassmorphic wallpapers, and dynamic accent controls.',
    gradientClass: 'from-fuchsia-900 via-purple-950 to-[#07050f]',
    previewType: 'themes',
    isFeatured: true,
  },
];

export const EXPLORE_POSTS_EN: BlogPost[] = [
  {
    id: 'post-stories',
    category: 'Product & Features',
    date: 'Jul 18, 2026',
    readTime: '3 min read',
    title: 'Share Your Moments: Introducing Eternal Stories with Rich Media Filters',
    description:
      'Seamless 24-hour ephemeral storytelling with live reaction stickers, viewer insights, and rich gesture animations directly in the feed.',
    gradientClass: 'from-rose-900 via-pink-950 to-[#07050f]',
    previewType: 'stories',
  },
  {
    id: 'post-voice-video',
    category: 'Product & Features',
    date: 'Jun 15, 2026',
    readTime: '4 min read',
    title: 'Voice Notes & Video Circles: Instant Audio Waveforms & Picture-in-Picture',
    description:
      'High-fidelity lossless voice recording with graphic audio waveforms and Telegram-style HD circular video notes.',
    gradientClass: 'from-teal-900 via-emerald-950 to-[#07050f]',
    previewType: 'voice-video',
  },
  {
    id: 'post-infinite-feed',
    category: 'Product & Features',
    date: 'May 20, 2026',
    readTime: '5 min read',
    title: 'Infinite Exploration: Introducing the High-Performance Feed Algorithm',
    description:
      'A deep dive into our 120 FPS infinite feed, instant local caching, dynamic recommendations, and fluid touch interactions.',
    gradientClass: 'from-cyan-900 via-blue-950 to-[#07050f]',
    previewType: 'feed',
  },
  {
    id: 'post-patch-notes',
    category: 'Engineering',
    date: 'Aug 10, 2026',
    readTime: '5 min read',
    title: 'Eternal Patch Notes: Performance, Instant Image Compression & Tab Sync',
    description:
      'Technical release notes covering WebAssembly image compression, tab badge synchronization, and argon2id client-side authentication.',
    gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
    previewType: 'patch-notes',
  },
  {
    id: 'post-genesis',
    category: 'Company HQ',
    date: 'Mar 01, 2026',
    readTime: '6 min read',
    title: 'Building from Scratch: The Genesis and Vision Behind Eternal',
    description:
      'How our small core team engineered a modern social network from zero with state-of-the-art glassmorphism and extreme privacy.',
    gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
    previewType: 'genesis',
  },
  {
    id: 'post-transparency',
    category: 'Policy & Safety',
    date: 'Aug 28, 2026',
    readTime: '4 min read',
    title: 'Platform Transparency: Legal, Privacy & Public Policy Hub',
    description:
      'A complete overview of our updated privacy policies, end-to-end encryption standards, and user data governance.',
    gradientClass: 'from-purple-900 via-slate-950 to-[#07050f]',
    previewType: 'transparency',
  },
];

export const BLOG_TRANSLATIONS: Record<string, BlogTranslations> = {
  English: {
    heroHeading: 'ETERNAL BLOG',
    featuredCategory: 'Featured',
    allCategory: 'All',
    productCategory: 'Product & Features',
    policyCategory: 'Policy & Safety',
    engineeringCategory: 'Engineering',
    companyCategory: 'Company HQ',
    communityCategory: 'Community',
    searchPlaceholder: 'Search...',
    exploreFurtherHeading: 'EXPLORE FURTHER',
    exploreFurtherSubtitle: 'Dive into additional articles and stay informed.',
    loadMoreButton: 'Load More',
    noResultsFound: 'No articles found matching your query.',
    heroArticle: HERO_ARTICLE_EN,
    featuredPosts: FEATURED_POSTS_EN,
    explorePosts: EXPLORE_POSTS_EN,
  },
  Українська: {
    heroHeading: 'БЛОГ ETERNAL',
    featuredCategory: 'Головне',
    allCategory: 'Усі',
    productCategory: 'Продукт та функції',
    policyCategory: 'Безпека та правила',
    engineeringCategory: 'Інженерія',
    companyCategory: 'Новини HQ',
    communityCategory: 'Спільнота',
    searchPlaceholder: 'Пошук...',
    exploreFurtherHeading: 'БІЛЬШЕ СТАТЕЙ',
    exploreFurtherSubtitle: 'Дізнавайтеся про всі деталі та оновлення платформи.',
    loadMoreButton: 'Завантажити ще',
    noResultsFound: 'За вашим запитом статей не знайдено.',
    heroArticle: {
      ...HERO_ARTICLE_EN,
      title: 'ЛИСТ ДО СПІЛЬНОТИ ETERNAL',
      subtitle:
        'Про наше прагнення будувати відкриту платформу з максимальною конфіденційністю, прозорістю та захистом користувачів.',
      description:
        'Ми підтверджуємо наші фундаментальні принципи: відсутність стеження, нуль прихованої телеметрії та справжній фокус на живому спілкуванні.',
    },
    featuredPosts: [
      {
        ...FEATURED_POSTS_EN[0],
        title: 'Зв’язок нового покоління: запуск месенджера Eternal',
        description:
          'Створено на WebSockets та WebRTC для миттєвих повідомлень, голосових кімнат та стрімів.',
      },
      {
        ...FEATURED_POSTS_EN[1],
        title: 'Виразіть себе: кастомні рідкі теми чатів та градієнти',
        description: 'Налаштовуйте особисті та групові чати підсвічуванням та градієнтними фонами.',
      },
    ],
    explorePosts: [
      {
        ...EXPLORE_POSTS_EN[0],
        title: 'Діліться моментами: зустрічайте Eternal Stories з фільтрами',
        description:
          '24-годинні історії прямо у верхній частині стрічки з реакціями та переглядами.',
      },
      {
        ...EXPLORE_POSTS_EN[1],
        title: 'Голосові та відео-кружечки: миттєвий кришталевий звук',
        description: 'Зручний запис аудіо-повідомлень зі звуковою хвилею та круглих відео-нотаток.',
      },
      {
        ...EXPLORE_POSTS_EN[2],
        title: 'Нескінченна стрічка: запуск алгоритму рекомендацій',
        description:
          'Огляд швидкої стрічки постів 120 FPS, миттєвого кешування та інтерактивних жестів.',
      },
      {
        ...EXPLORE_POSTS_EN[3],
        title: 'Патч-ноути Eternal: оптимізація та стиснення зображень',
        description: 'Огляд технічних покращень, синхронізації та безпеки авторизації.',
      },
      {
        ...EXPLORE_POSTS_EN[4],
        title: 'Створення з нуля: витоки та місія Eternal',
        description: 'Шлях від ідеї до сучасної масштабної соціальної екосистеми.',
      },
      {
        ...EXPLORE_POSTS_EN[5],
        title: 'Прозорість платформи: запуск юридичного центру',
        description: 'Огляд оновлених правил конфіденційності та шифрування даних.',
      },
    ],
  },
  Deutsch: {
    heroHeading: 'ETERNAL BLOG',
    featuredCategory: 'Highlights',
    allCategory: 'Alle',
    productCategory: 'Produkt & Features',
    policyCategory: 'Sicherheit & Richtlinien',
    engineeringCategory: 'Entwicklung',
    companyCategory: 'Unternehmen',
    communityCategory: 'Community',
    searchPlaceholder: 'Suchen...',
    exploreFurtherHeading: 'MEHR ENTDECKEN',
    exploreFurtherSubtitle: 'Erfahren Sie mehr über unsere neuesten Updates.',
    loadMoreButton: 'Mehr laden',
    noResultsFound: 'Keine Artikel gefunden.',
    heroArticle: HERO_ARTICLE_EN,
    featuredPosts: FEATURED_POSTS_EN,
    explorePosts: EXPLORE_POSTS_EN,
  },
  Español: {
    heroHeading: 'BLOG DE ETERNAL',
    featuredCategory: 'Destacados',
    allCategory: 'Todos',
    productCategory: 'Producto y Funciones',
    policyCategory: 'Seguridad y Políticas',
    engineeringCategory: 'Ingeniería',
    companyCategory: 'Empresa',
    communityCategory: 'Comunidad',
    searchPlaceholder: 'Buscar...',
    exploreFurtherHeading: 'EXPLORAR MÁS',
    exploreFurtherSubtitle: 'Descubre más artículos y mantente informado.',
    loadMoreButton: 'Cargar más',
    noResultsFound: 'No se encontraron artículos.',
    heroArticle: HERO_ARTICLE_EN,
    featuredPosts: FEATURED_POSTS_EN,
    explorePosts: EXPLORE_POSTS_EN,
  },
  Français: {
    heroHeading: 'BLOG D’ETERNAL',
    featuredCategory: 'À la une',
    allCategory: 'Tous',
    productCategory: 'Produit & Fonctionnalités',
    policyCategory: 'Sécurité & Politiques',
    engineeringCategory: 'Ingénierie',
    companyCategory: 'Entreprise',
    communityCategory: 'Communauté',
    searchPlaceholder: 'Rechercher...',
    exploreFurtherHeading: 'EXPLORER PLUS',
    exploreFurtherSubtitle: 'Découvrez d’autres articles et restez informés.',
    loadMoreButton: 'Charger plus',
    noResultsFound: 'Aucun article trouvé.',
    heroArticle: HERO_ARTICLE_EN,
    featuredPosts: FEATURED_POSTS_EN,
    explorePosts: EXPLORE_POSTS_EN,
  },
};
