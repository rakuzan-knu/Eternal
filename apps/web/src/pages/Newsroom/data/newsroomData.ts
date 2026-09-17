export interface PressReleaseItem {
  id: string;
  tag: string;
  date: string;
  title: string;
  description: string;
  gradientClass: string;
  iconText: string;
}

export interface BlogUpdateItem {
  id: string;
  category: string;
  title: string;
  description: string;
  gradientClass: string;
  badgeEmoji: string;
}

export interface NewsroomTranslations {
  heroTitle: string;
  heroSubtitle: string;
  viewBrandKit: string;
  pressReleasesHeading: string;
  loadMoreButton: string;
  blogHeading: string;
  brandKitHeading: string;
  brandKitSubtitle: string;
  brandKitButton: string;
  contactHeading: string;
  contactSubtitle: string;
  contactButton: string;
  pressReleases: PressReleaseItem[];
  blogUpdates: BlogUpdateItem[];
}

export const PRESS_RELEASES_EN: PressReleaseItem[] = [
  {
    id: 'pr-legal-hub',
    tag: 'Announcement',
    date: 'Aug 28, 2026',
    title:
      'Eternal Expands Platform Transparency: Launching Comprehensive Legal, Privacy & Policy Hub',
    description:
      'A complete redesign of user rights, safety centers, terms of service, and open-source licensing to empower millions of users worldwide.',
    gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
    iconText: '🛡️',
  },
  {
    id: 'pr-chat-themes',
    tag: 'Product Update',
    date: 'Aug 20, 2026',
    title:
      'Express Yourself: Eternal Introduces Custom Liquid Chat Themes, Gradients & Accent Controls',
    description:
      'Transforming direct messages and group lounges with tailored color swatches, glassmorphic wallpapers, and dynamic contrast modes.',
    gradientClass: 'from-fuchsia-900 via-purple-950 to-[#07050f]',
    iconText: '🎨',
  },
  {
    id: 'pr-stories',
    tag: 'Press Release',
    date: 'Jul 15, 2026',
    title: 'Share Your Moments: Introducing Eternal Stories with Real-Time Rich Media Filters',
    description:
      'Seamless 24-hour ephemeral storytelling integrated directly at the top of the feed with interactive reaction stickers and views analytics.',
    gradientClass: 'from-rose-900 via-pink-950 to-[#07050f]',
    iconText: '✨',
  },
  {
    id: 'pr-voice-video-circles',
    tag: 'Feature Launch',
    date: 'Jun 10, 2026',
    title:
      'Voice Notes & Video Circles: Instant Crystal-Clear Waveforms and Picture-in-Picture Loops',
    description:
      'Bringing immersive audio messages and Telegram-style video round notes directly into conversations with zero audio compression lag.',
    gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
    iconText: '🎙️',
  },
];

export const BLOG_UPDATES_EN: BlogUpdateItem[] = [
  {
    id: 'blog-messenger-launch',
    category: 'Product & Features',
    title:
      'Next-Gen Communication: The Launch of Eternal Messenger with Real-Time WebSockets & WebRTC',
    description:
      'How we engineered high-concurrency low-latency messaging, voice lounges, and live screen broadcasts for modern teams and gaming squads.',
    gradientClass: 'from-[#1c1538] via-[#120f24] to-[#07050f]',
    badgeEmoji: '💬',
  },
  {
    id: 'blog-infinite-feed',
    category: 'Eternal Core',
    title: 'Infinite Exploration: Introducing the High-Performance Feed & Discovery Algorithm',
    description:
      'A deep dive into our dynamic recommendation engine, fluid gesture interactions, and lightning-fast media caching architecture.',
    gradientClass: 'from-[#152238] via-[#0d1624] to-[#07050f]',
    badgeEmoji: '🚀',
  },
  {
    id: 'blog-genesis',
    category: 'Eternal Story',
    title: 'Building from Scratch: The Genesis and Vision Behind the Eternal Social Platform',
    description:
      'From an ambitious concept to a full-fledged social universe built with modern standards, extreme privacy, and rich glass aesthetics.',
    gradientClass: 'from-[#2e1538] via-[#1a0f24] to-[#07050f]',
    badgeEmoji: '👑',
  },
];

export const NEWSROOM_TRANSLATIONS: Record<string, NewsroomTranslations> = {
  English: {
    heroTitle: 'PRESS CENTER',
    heroSubtitle: 'Explore the latest announcements and news from Eternal.',
    viewBrandKit: 'View Brand Kit',
    pressReleasesHeading: 'PRESS RELEASES AND ANNOUNCEMENTS',
    loadMoreButton: 'Load More',
    blogHeading: 'UPDATES FROM THE ETERNAL BLOG',
    brandKitHeading: 'ETERNAL BRAND KIT',
    brandKitSubtitle:
      'We love when people talk about us. We REALLY love when people do it with correct brand assets.',
    brandKitButton: 'Learn More',
    contactHeading: 'CONTACT OUR PRESS TEAM',
    contactSubtitle: 'Reach out to our Press team for any inquiries.',
    contactButton: 'Contact Us',
    pressReleases: PRESS_RELEASES_EN,
    blogUpdates: BLOG_UPDATES_EN,
  },
  Українська: {
    heroTitle: 'ПРЕС-ЦЕНТР',
    heroSubtitle: 'Дізнавайтеся про найсвіжіші анонси, оновлення та новини Eternal.',
    viewBrandKit: 'Переглянути Brand Kit',
    pressReleasesHeading: 'ПРЕС-РЕЛІЗИ ТА ОФІЦІЙНІ АНОНСИ',
    loadMoreButton: 'Завантажити ще',
    blogHeading: 'НОВИНИ З БЛОГУ ETERNAL',
    brandKitHeading: 'ФІРМОВИЙ НАБІР ETERNAL BRAND KIT',
    brandKitSubtitle:
      'Ми раді, коли про нас говорять. І ми ДУЖЕ раді, коли при цьому використовують офіційні матеріали нашого бренду.',
    brandKitButton: 'Дізнатися більше',
    contactHeading: 'ЗВ’ЯЗОК З ПРЕС-СЛУЖБОЮ',
    contactSubtitle: 'Зв’яжіться з нашою командою прес-служби з будь-яких питань чи запитів.',
    contactButton: 'Написати нам',
    pressReleases: [
      {
        id: 'pr-legal-hub',
        tag: 'Офіційний анонс',
        date: '28 Серпня 2026',
        title: 'Eternal розширює прозорість платформи: запуск юридичного та правового центру',
        description:
          'Повне оновлення сторінок конфіденційності, умов використання, ліцензій та правил спільноти.',
        gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
        iconText: '🛡️',
      },
      {
        id: 'pr-chat-themes',
        tag: 'Оновлення продукту',
        date: '20 Серпня 2026',
        title: 'Виразіть себе: Eternal представляє кастомізацію тем чатів та градієнтів',
        description:
          'Індивідуальні кольорові теми та підсвічування для особистих і групових діалогів.',
        gradientClass: 'from-fuchsia-900 via-purple-950 to-[#07050f]',
        iconText: '🎨',
      },
      {
        id: 'pr-stories',
        tag: 'Прес-реліз',
        date: '15 Липня 2026',
        title: 'Діліться моментами: зустрічайте Eternal Stories з фільтрами та реакціями',
        description:
          '24-годинні історії прямо у верхній частині стрічки з інтерактивними стікерами та переглядами.',
        gradientClass: 'from-rose-900 via-pink-950 to-[#07050f]',
        iconText: '✨',
      },
      {
        id: 'pr-voice-video-circles',
        tag: 'Запуск функції',
        date: '10 Червня 2026',
        title: 'Голосові повідомлення та відео-кружечки: миттєвий кришталевий звук',
        description:
          'Зручний запис аудіо-повідомлень з графічною звуковою хвилею та круглих відео-нотаток.',
        gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
        iconText: '🎙️',
      },
    ],
    blogUpdates: [
      {
        id: 'blog-messenger-launch',
        category: 'Продукт та функції',
        title: 'Зв’язок нового покоління: запуск месенджера Eternal на базі WebSockets та WebRTC',
        description:
          'Як ми спроектували надійний і швидкий месенджер з голосовими кімнатами та стрімінгом.',
        gradientClass: 'from-[#1c1538] via-[#120f24] to-[#07050f]',
        badgeEmoji: '💬',
      },
      {
        id: 'blog-infinite-feed',
        category: 'Ядро Eternal',
        title: 'Нескінченна стрічка: запуск алгоритму рекомендацій та публікацій',
        description:
          'Огляд розумної стрічки постів, миттєвого завантаження та інтерактивних жестів.',
        gradientClass: 'from-[#152238] via-[#0d1624] to-[#07050f]',
        badgeEmoji: '🚀',
      },
      {
        id: 'blog-genesis',
        category: 'Історія Eternal',
        title: 'Створення з нуля: витоки та місія соціальної платформи Eternal',
        description: 'Шлях від першої ідеї до сучасної масштабної соціальної екосистеми.',
        gradientClass: 'from-[#2e1538] via-[#1a0f24] to-[#07050f]',
        badgeEmoji: '👑',
      },
    ],
  },
  Deutsch: {
    heroTitle: 'PRESSEZENTRUM',
    heroSubtitle: 'Entdecken Sie die neuesten Ankündigungen und Neuigkeiten von Eternal.',
    viewBrandKit: 'Brand Kit ansehen',
    pressReleasesHeading: 'PRESSEMITTEILUNGEN & ANKÜNDIGUNGEN',
    loadMoreButton: 'Mehr laden',
    blogHeading: 'NEUIGKEITEN AUS DEM ETERNAL-BLOG',
    brandKitHeading: 'ETERNAL BRAND KIT',
    brandKitSubtitle: 'Nutzen Sie stets die offiziellen Marken-Assets von Eternal.',
    brandKitButton: 'Mehr erfahren',
    contactHeading: 'KONTAKT ZUM PRESSE-TEAM',
    contactSubtitle: 'Kontaktieren Sie unser Presseteam bei Fragen.',
    contactButton: 'Kontaktieren',
    pressReleases: PRESS_RELEASES_EN,
    blogUpdates: BLOG_UPDATES_EN,
  },
  Español: {
    heroTitle: 'CENTRO DE PRENSA',
    heroSubtitle: 'Descubre los últimos anuncios y noticias de Eternal.',
    viewBrandKit: 'Ver Brand Kit',
    pressReleasesHeading: 'COMUNICADOS DE PRENSA Y ANUNCIOS',
    loadMoreButton: 'Cargar más',
    blogHeading: 'NOTICIAS DEL BLOG DE ETERNAL',
    brandKitHeading: 'KIT DE MARCA ETERNAL',
    brandKitSubtitle: 'Utiliza siempre nuestros recursos oficiales de marca.',
    brandKitButton: 'Más información',
    contactHeading: 'CONTACTA CON NUESTRO EQUIPO DE PRENSA',
    contactSubtitle: 'Ponte en contacto con nuestro equipo para cualquier consulta.',
    contactButton: 'Contactar',
    pressReleases: PRESS_RELEASES_EN,
    blogUpdates: BLOG_UPDATES_EN,
  },
  Français: {
    heroTitle: 'CENTRE DE PRESSE',
    heroSubtitle: 'Découvrez les dernières annonces et actualités d’Eternal.',
    viewBrandKit: 'Voir le Brand Kit',
    pressReleasesHeading: 'COMMUNIQUÉS DE PRESSE ET ANNONCES',
    loadMoreButton: 'Charger plus',
    blogHeading: 'ACTUALITÉS DU BLOG ETERNAL',
    brandKitHeading: 'KIT DE MARQUE ETERNAL',
    brandKitSubtitle: 'Utilisez nos éléments de marque officiels.',
    brandKitButton: 'En savoir plus',
    contactHeading: 'CONTACTER L’ÉQUIPE PRESSE',
    contactSubtitle: 'Contactez notre équipe presse pour toute demande.',
    contactButton: 'Nous contacter',
    pressReleases: PRESS_RELEASES_EN,
    blogUpdates: BLOG_UPDATES_EN,
  },
};
