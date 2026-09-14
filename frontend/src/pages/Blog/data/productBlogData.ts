import { BlogPost } from './blogData';

export interface ProductBlogCategoryData {
  title: string;
  subtitle: string;
  heroArticle: BlogPost;
  featuredPosts: BlogPost[];
  explorePosts: BlogPost[];
  categoryName: string;
}

export const PRODUCT_BLOG_DATA_EN: ProductBlogCategoryData = {
  title: 'PRODUCT & FEATURES',
  subtitle: 'Announcements, new features, and general info about the Eternal app.',
  categoryName: 'Product & Features',
  heroArticle: {
    id: 'product-game-linking',
    category: 'Product & Features',
    date: 'Aug 29, 2026',
    readTime: '4 min read',
    title: 'LINK ETERNAL AND YOUR FAVORITE GAMES TO KEEP THE GUILD CHATTING WHEREVER YOU ARE',
    subtitle:
      'Gather your guildmates! Link your Eternal and gaming platform accounts to unlock real-time synced in-game overlay chat, instant lobby invitations, and rich cross-platform presence.',
    description:
      'Never miss a raid callout or match queue. With our new Game Bridge API, your in-game guild chat and Eternal channel stay 100% in sync with zero latency.',
    gradientClass: 'from-[#1e1347] via-[#100a33] to-[#07050f]',
    previewType: 'product-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'product-changelog-aug',
      category: 'Product & Features',
      date: 'Aug 24, 2026',
      readTime: '3 min read',
      title: 'Eternal Update: August 2026 Changelog & Major Feature Drop',
      description:
        'Custom audio soundboards, enhanced 4K 60FPS screen sharing for Eternal Premium members, and faster instant app startup times across all desktop platforms.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'product-changelog-aug' as any,
      isFeatured: true,
    },
    {
      id: 'product-ai-assistant',
      category: 'Product & Features',
      date: 'Aug 18, 2026',
      readTime: '4 min read',
      title: 'Meet Eternal Assistant: Context-Aware Summaries, Smart Search & Voice Notes',
      description:
        'Catch up on busy channels in seconds with private on-device conversation summaries and automatic voice channel meeting action items.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'product-ai-assistant' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'product-patch-july',
      category: 'Product & Features',
      date: 'Jul 29, 2026',
      readTime: '3 min read',
      title: 'Eternal Patch Notes: July 2026 Quality-of-Life Improvements',
      description:
        'Smoother window resizing, ultra-low battery drain on macOS Apple Silicon, and redesigned reaction picker drawers.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'product-patch-july' as any,
    },
    {
      id: 'product-spatial-vr',
      category: 'Product & Features',
      date: 'Jul 21, 2026',
      readTime: '4 min read',
      title: 'Eternal is Now on Spatial & VR Headsets: Immersive 3D Voice Lounges',
      description:
        'Hang out with your server friends in full 3D spatial audio environments with hand tracking and floating multi-screen sharing.',
      gradientClass: 'from-purple-900 via-pink-950 to-[#07050f]',
      previewType: 'product-spatial-vr' as any,
    },
    {
      id: 'product-changelog-june',
      category: 'Product & Features',
      date: 'Jun 25, 2026',
      readTime: '3 min read',
      title: 'Eternal Update: June 2026 Changelog & Performance Boost',
      description:
        '50% reduction in memory usage for servers with over 100k members, custom message sound effects, and new status icons.',
      gradientClass: 'from-sky-900 via-blue-950 to-[#07050f]',
      previewType: 'product-changelog-june' as any,
    },
    {
      id: 'product-soundboard',
      category: 'Product & Features',
      date: 'Jun 15, 2026',
      readTime: '3 min read',
      title: 'Introducing Soundboard & Spatial Audio Effects for All Voice Channels',
      description:
        'Play fun reaction sounds, custom voice memes, and sound bites directly inside voice lounges with volume balancing.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'product-soundboard' as any,
    },
    {
      id: 'product-4k-stream',
      category: 'Product & Features',
      date: 'Jun 08, 2026',
      readTime: '3 min read',
      title: 'Stream in Crisp 4K 60FPS with Ultra-Low Latency AV1 Encoding',
      description:
        'Next-generation AV1 hardware encoding delivers higher fidelity screen sharing at half the bandwidth consumption.',
      gradientClass: 'from-pink-900 via-rose-950 to-[#07050f]',
      previewType: 'product-4k-stream' as any,
    },
    {
      id: 'product-handoff',
      category: 'Product & Features',
      date: 'May 30, 2026',
      readTime: '3 min read',
      title: 'Cross-Device Handoff: Seamlessly Transfer Calls Between Phone and PC',
      description:
        'Transfer voice and video calls from your phone to your computer with a single tap without dropping audio for a second.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'product-handoff' as any,
    },
  ],
};

export const PRODUCT_BLOG_DATA_UK: ProductBlogCategoryData = {
  title: 'ПРОДУКТ ТА ФУНКЦІЇ',
  subtitle: 'Анонси, нові функції та загальна інформація про додаток Eternal.',
  categoryName: 'Продукт та функції',
  heroArticle: {
    id: 'product-game-linking',
    category: 'Продукт та функції',
    date: '29 серп. 2026',
    readTime: '4 хв читання',
    title: 'СИНХРОНІЗУЙТЕ ETERNAL З УЛЮБЛЕНИМИ ІГРАМИ ДЛЯ СПІЛКУВАННЯ ГІЛЬДІЇ ДЕ ЗАВГОДНО',
    subtitle:
      'Збирайте друзів та гільдію! Підключайте акаунти ігрових платформ для синхронізації чату в грі, миттєвих запрошень у лобі та відображення активності.',
    description:
      'Не пропускайте жодного рейду чи матчу. Завдяки нашому API Game Bridge ваш внутрішньоігровий чат гільдії та канал у Eternal працюють синхронно без затримок.',
    gradientClass: 'from-[#1e1347] via-[#100a33] to-[#07050f]',
    previewType: 'product-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'product-changelog-aug',
      category: 'Продукт та функції',
      date: '24 серп. 2026',
      readTime: '3 хв читання',
      title: 'Оновлення Eternal: Журнал змін за серпень 2026 та великий реліз функцій',
      description:
        'Користувацькі саундборди, трансляція екрана в 4K 60FPS для передплатників та прискорений запуск додатка на ПК.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'product-changelog-aug' as any,
      isFeatured: true,
    },
    {
      id: 'product-ai-assistant',
      category: 'Продукт та функції',
      date: '18 серп. 2026',
      readTime: '4 хв читання',
      title:
        'Зустрічайте Eternal Assistant: Контекстні підсумки, розумний пошук та голосові нотатки',
      description:
        'Дізнавайтеся головне з активних каналів за лічені секунди за допомогою локальних підсумків бесіди без витоку особистих даних.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'product-ai-assistant' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'product-patch-july',
      category: 'Продукт та функції',
      date: '29 лип. 2026',
      readTime: '3 хв читання',
      title: 'Патч Eternal: Покращення комфорту та інтерфейсу за липень 2026',
      description:
        'Плавніша зміна розмірів вікна, зменшене енергоспоживання на Apple Silicon та оновлена панель вибору реакцій.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'product-patch-july' as any,
    },
    {
      id: 'product-spatial-vr',
      category: 'Продукт та функції',
      date: '21 лип. 2026',
      readTime: '4 хв читання',
      title: 'Eternal тепер у просторових та VR-гарнітурах: Імерсивні 3D голосові кімнати',
      description:
        'Спілкуйтеся з друзями в повному 3D просторовому аудіосередовищі з відстеженням рук та плаваючими екранами.',
      gradientClass: 'from-purple-900 via-pink-950 to-[#07050f]',
      previewType: 'product-spatial-vr' as any,
    },
    {
      id: 'product-changelog-june',
      category: 'Продукт та функції',
      date: '25 черв. 2026',
      readTime: '3 хв читання',
      title: 'Оновлення Eternal: Журнал змін за червень 2026 та прискорення роботи',
      description:
        'Зниження використання оперативної пам’яті на 50% для великих серверів, нові звукові ефекти та статуси.',
      gradientClass: 'from-sky-900 via-blue-950 to-[#07050f]',
      previewType: 'product-changelog-june' as any,
    },
    {
      id: 'product-soundboard',
      category: 'Продукт та функції',
      date: '15 черв. 2026',
      readTime: '3 хв читання',
      title: 'Представляємо Саундборд та просторові звукові ефекти для голосових каналів',
      description:
        'Відтворюйте яскраві звукові реакції, меми та аудіоефекти прямо під час спілкування в голосових кімнатах.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'product-soundboard' as any,
    },
    {
      id: 'product-4k-stream',
      category: 'Продукт та функції',
      date: '08 черв. 2026',
      readTime: '3 хв читання',
      title: 'Стрімінг у 4K 60FPS з ультранизькою затримкою завдяки кодеку AV1',
      description:
        'Апаратне кодування AV1 забезпечує кришталеву чіткість демонстрації екрана при вдвічі меншому споживанні трафіку.',
      gradientClass: 'from-pink-900 via-rose-950 to-[#07050f]',
      previewType: 'product-4k-stream' as any,
    },
    {
      id: 'product-handoff',
      category: 'Продукт та функції',
      date: '30 трав. 2026',
      readTime: '3 хв читання',
      title: 'Крос-платформний Handoff: Безшовне перемикання дзвінків між смартфоном та ПК',
      description:
        'Миттєво перемикайте аудіо- та відеодзвінки з телефону на комп’ютер в один дотик без переривання зв’язку.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'product-handoff' as any,
    },
  ],
};

export const PRODUCT_BLOG_TRANSLATIONS: Record<string, ProductBlogCategoryData> = {
  English: PRODUCT_BLOG_DATA_EN,
  Українська: PRODUCT_BLOG_DATA_UK,
  Deutsch: PRODUCT_BLOG_DATA_EN,
  Español: PRODUCT_BLOG_DATA_EN,
  Français: PRODUCT_BLOG_DATA_EN,
};
