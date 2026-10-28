import { BlogPost } from './blogData';

export interface EngineeringBlogCategoryData {
  title: string;
  subtitle: string;
  heroArticle: BlogPost;
  featuredPosts: BlogPost[];
  explorePosts: BlogPost[];
  categoryName: string;
}

export const ENGINEERING_BLOG_DATA_EN: EngineeringBlogCategoryData = {
  title: 'ENGINEERING & DEVELOPERS',
  subtitle: 'Resources and news for engineers and Eternal app developers.',
  categoryName: 'Engineering & Devs',
  heroArticle: {
    id: 'engineering-sdk-v2-launch',
    category: 'Engineering & Developers',
    date: 'Aug 29, 2026',
    readTime: '6 min read',
    title: 'GENERAL AVAILABILITY OF CROSS-PLATFORM CLIENT SUPPORT IN ETERNAL SOCIAL SDK V2.0',
    subtitle:
      'Multiplatform client support is now generally available in the Eternal Social SDK, allowing developers to extend Eternal’s real-time messaging, voice channels, and interactive canvas overlays seamlessly to iOS, Android, and Desktop.',
    description:
      'Explore our upgraded TypeScript and Rust libraries, WebRTC media bridges, rich presence synchronization, and interactive activity embeds designed for native performance.',
    gradientClass: 'from-[#190d3d] via-[#100729] to-[#07050f]',
    previewType: 'engineering-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'engineering-rust-websockets',
      category: 'Engineering & Developers',
      date: 'Aug 24, 2026',
      readTime: '4 min read',
      title: 'Building High-Throughput Real-Time Sync with Rust, Tokio, and WebSockets',
      description:
        'How we achieved 100,000 concurrent socket connections per node with zero garbage-collection pauses and sub-millisecond dispatch times.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'engineering-rust' as any,
      isFeatured: true,
    },
    {
      id: 'engineering-verified-apps',
      category: 'Engineering & Developers',
      date: 'Aug 19, 2026',
      readTime: '4 min read',
      title: 'Verified App Developer Program: Build, Monetize, and Scale on Eternal',
      description:
        'Introducing app monetization APIs, server webhook triggers, and verified bot badges for indie toolmakers and gaming communities.',
      gradientClass: 'from-indigo-900 via-blue-950 to-[#07050f]',
      previewType: 'engineering-sdk' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'engineering-data-caching',
      category: 'Engineering & Developers',
      date: 'Aug 14, 2026',
      readTime: '4 min read',
      title: 'You’ve Got (Too Much) Data: Optimizing Query Latency with Distributed Memory Tiering',
      description:
        'Techniques for indexing millions of chat records without database bottlenecks using Redis Cluster and memory-mapped append logs.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'engineering-bot' as any,
    },
    {
      id: 'engineering-voice-jitter',
      category: 'Engineering & Developers',
      date: 'Aug 07, 2026',
      readTime: '3 min read',
      title: 'Under the Hood: How We Reduced Voice Room Audio Jitter to 2ms Worldwide',
      description:
        'Tuning custom WebRTC Opus forward error correction, adaptive jitter buffering, and globally routed edge media relays.',
      gradientClass: 'from-fuchsia-900 via-pink-950 to-[#07050f]',
      previewType: 'engineering-jitter' as any,
    },
    {
      id: 'engineering-verified-portals',
      category: 'Engineering & Developers',
      date: 'Jul 31, 2026',
      readTime: '3 min read',
      title: 'Claim Your Game Integration: Official Verified Developer Portals & Rich Presence',
      description:
        'Deep-link match invites, custom game statuses, and interactive squad lobbies directly in the Eternal desktop overlay.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'engineering-verified' as any,
    },
    {
      id: 'engineering-wasm-sandbox',
      category: 'Engineering & Developers',
      date: 'Jul 23, 2026',
      readTime: '4 min read',
      title: 'WebAssembly in the Browser: Running Untrusted Plugins at Native Speed',
      description:
        'Isolating community extension code inside WebAssembly sandboxes with strict memory barriers and secure DOM capability gates.',
      gradientClass: 'from-blue-900 via-cyan-950 to-[#07050f]',
      previewType: 'engineering-wasm' as any,
    },
    {
      id: 'engineering-zero-downtime',
      category: 'Engineering & Developers',
      date: 'Jul 16, 2026',
      readTime: '4 min read',
      title: 'Zero-Downtime Database Migrations: Lessons from 100M Messages per Day',
      description:
        'Blue-green table schema rollouts, dual-write queues, and backward-compatible serialization strategies without maintenance windows.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'engineering-migrations' as any,
    },
    {
      id: 'engineering-e2e-encryption',
      category: 'Engineering & Developers',
      date: 'Jul 08, 2026',
      readTime: '4 min read',
      title: 'Securing Real-Time Video: End-to-End Key Exchange with the Signal Protocol',
      description:
        'Architecting MLS and Double Ratchet key negotiation for multi-party voice lounges and video group calls.',
      gradientClass: 'from-teal-900 via-emerald-950 to-[#07050f]',
      previewType: 'engineering-e2e' as any,
    },
  ],
};

export const ENGINEERING_BLOG_DATA_UK: EngineeringBlogCategoryData = {
  title: 'ІНЖЕНЕРІЯ ТА РОЗРОБКА',
  subtitle: 'Ресурси та новини для інженерів і розробників додатків для Eternal.',
  categoryName: 'Інженерія та розробники',
  heroArticle: {
    id: 'engineering-sdk-v2-launch',
    category: 'Інженерія та розробка',
    date: '29 серп. 2026',
    readTime: '6 хв читання',
    title: 'ЗАГАЛЬНА ДОСТУПНІСТЬ КРОСПЛАТФОРМНОГО КЛІЄНТСЬКОГО SDK В ETERNAL SOCIAL SDK V2.0',
    subtitle:
      'Кросплатформна підтримка тепер загальнодоступна в Eternal Social SDK, дозволяючи розробникам розширювати обмін повідомленнями, голосові канали та інтерактивні оверлеї на iOS, Android та Desktop.',
    description:
      'Ознайомтеся з оновленими бібліотеками TypeScript та Rust, медіашлюзами WebRTC, синхронізацією присутності та інтерактивними модулями для нативної швидкості.',
    gradientClass: 'from-[#190d3d] via-[#100729] to-[#07050f]',
    previewType: 'engineering-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'engineering-rust-websockets',
      category: 'Інженерія та розробка',
      date: '24 серп. 2026',
      readTime: '4 хв читання',
      title: 'Створення високонавантаженої синхронізації в реальному часі на Rust і WebSockets',
      description:
        'Як ми досягли 100,000 одночасних сокет-з’єднань на один сервер без пауз збирача сміття та із затримкою менше мілісекунди.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'engineering-rust' as any,
      isFeatured: true,
    },
    {
      id: 'engineering-verified-apps',
      category: 'Інженерія та розробка',
      date: '19 серп. 2026',
      readTime: '4 хв читання',
      title: 'Програма верифікованих розробників: Створюйте та масштабуйте на Eternal',
      description:
        'Представляємо API монетизації додатків, серверні вебхуки та верифіковані бейджі для авторів інструментів та ігрових спільнот.',
      gradientClass: 'from-indigo-900 via-blue-950 to-[#07050f]',
      previewType: 'engineering-sdk' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'engineering-data-caching',
      category: 'Інженерія та розробка',
      date: '14 серп. 2026',
      readTime: '4 хв читання',
      title: 'Оптимізація запитів при великих обсягах даних за допомогою розподіленого кешування',
      description:
        'Методи індексації мільйонів записів чату без вузьких місць у базі даних за допомогою Redis Cluster та логів у пам’яті.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'engineering-bot' as any,
    },
    {
      id: 'engineering-voice-jitter',
      category: 'Інженерія та розробка',
      date: '07 серп. 2026',
      readTime: '3 хв читання',
      title:
        'Під капотом: Як ми знизили джиттер аудіо в голосових кімнатах до 2 мс по всьому світу',
      description:
        'Налаштування алгоритмів WebRTC Opus для відновлення втрачених пакетів та глобально маршрутизовані медіавузли.',
      gradientClass: 'from-fuchsia-900 via-pink-950 to-[#07050f]',
      previewType: 'engineering-jitter' as any,
    },
    {
      id: 'engineering-verified-portals',
      category: 'Інженерія та розробка',
      date: '31 лип. 2026',
      readTime: '3 хв читання',
      title: 'Інтеграція відеоігор: Офіційні портали розробників та Rich Presence',
      description:
        'Швидкі запрошення в матчі, персональні статуси активності та спільні лобі безпосередньо в оверлеї Eternal.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'engineering-verified' as any,
    },
    {
      id: 'engineering-wasm-sandbox',
      category: 'Інженерія та розробка',
      date: '23 лип. 2026',
      readTime: '4 хв читання',
      title: 'WebAssembly в браузері: Запуск користувацьких плагінів на нативній швидкості',
      description:
        'Ізоляція коду плагінів у пісочниці WebAssembly із суворими межами пам’яті та безпечним доступом до API.',
      gradientClass: 'from-blue-900 via-cyan-950 to-[#07050f]',
      previewType: 'engineering-wasm' as any,
    },
    {
      id: 'engineering-zero-downtime',
      category: 'Інженерія та розробка',
      date: '16 лип. 2026',
      readTime: '4 хв читання',
      title: 'Міграції баз даних без простоїв: Досвід обробки 100 млн повідомлень на день',
      description:
        'Безшовне розгортання схем баз даних, черги подвійного запису та сумісна серіалізація без технічних зупинок.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'engineering-migrations' as any,
    },
    {
      id: 'engineering-e2e-encryption',
      category: 'Інженерія та розробка',
      date: '08 лип. 2026',
      readTime: '4 хв читання',
      title: 'Захист відеодзвінків: Наскрізне шифрування за протоколом Signal',
      description:
        'Архітектура узгодження ключів Double Ratchet для групових голосових і відеоконференцій.',
      gradientClass: 'from-teal-900 via-emerald-950 to-[#07050f]',
      previewType: 'engineering-e2e' as any,
    },
  ],
};

export const ENGINEERING_BLOG_TRANSLATIONS: Record<string, EngineeringBlogCategoryData> = {
  English: ENGINEERING_BLOG_DATA_EN,
  Українська: ENGINEERING_BLOG_DATA_UK,
  Deutsch: ENGINEERING_BLOG_DATA_EN,
  Español: ENGINEERING_BLOG_DATA_EN,
  Français: ENGINEERING_BLOG_DATA_EN,
};
