import { BlogPost } from './blogData';

export interface CommunityCategoryData {
  title: string;
  subtitle: string;
  heroArticle: BlogPost;
  featuredPosts: BlogPost[];
  explorePosts: BlogPost[];
  categoryName: string;
}

export const COMMUNITY_DATA_EN: CommunityCategoryData = {
  title: 'COMMUNITY',
  subtitle:
    'Stories, spotlights, and behind the scenes from the heart and soul of Eternal: the community.',
  categoryName: 'Community',
  heroArticle: {
    id: 'community-cleanup-report',
    category: 'Community',
    date: 'Aug 28, 2026',
    readTime: '4 min read',
    title: 'INTRODUCING THE COMMUNITY MODERATION & CREATOR TOOLKIT REPORT',
    subtitle:
      'Eternal has built a whole suite of creator controls and proactive moderation features dedicated to bringing group admins more power, direct member tips, and seamless channel onboarding.',
    description:
      'Check out the first major release of our community safety and creator empowerment tools, including automated rule filters, role tiers, creator analytics, and zero-spam verification.',
    gradientClass: 'from-fuchsia-600 via-purple-700 to-indigo-900',
    previewType: 'community-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'community-creator-hubs',
      category: 'Community',
      date: 'Aug 22, 2026',
      readTime: '3 min read',
      title: 'Creator Hubs & Verified Badges: Empowering Independent Voices',
      description:
        'Custom community badges, subscriber loyalty perks, and dedicated creator dashboards for writers, artists, and live streamers.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'community-spotlight' as any,
      isFeatured: true,
    },
    {
      id: 'community-art-festival',
      category: 'Community',
      date: 'Aug 18, 2026',
      readTime: '3 min read',
      title: 'Celebrating Digital Artists: Eternal Creative Stage & Live Jam Nights',
      description:
        'How thousands of musicians and designers host real-time collaborative workshops and live broadcasts on Eternal.',
      gradientClass: 'from-amber-600 via-pink-700 to-purple-900',
      previewType: 'community-music' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'community-moderation-summit',
      category: 'Community',
      date: 'Aug 12, 2026',
      readTime: '4 min read',
      title: 'Global Mod Summit: Safer Digital Spaces & Proactive Mod Tools',
      description:
        'Announcing community auto-quarantine, raid protection triggers, and enhanced moderator permission hierarchies.',
      gradientClass: 'from-emerald-800 via-teal-900 to-[#07050f]',
      previewType: 'community-mods' as any,
    },
    {
      id: 'community-gaming-guilds',
      category: 'Community',
      date: 'Aug 06, 2026',
      readTime: '3 min read',
      title: 'Gamers & Esports Guilds: Low-Latency Screen Broadcasts & Voice Lounges',
      description:
        'Zero-lag game streaming with crystal-clear 60 FPS video and synchronized sound for competitive teams.',
      gradientClass: 'from-violet-900 via-purple-950 to-[#07050f]',
      previewType: 'community-gaming' as any,
    },
    {
      id: 'community-student-spaces',
      category: 'Community',
      date: 'Jul 29, 2026',
      readTime: '3 min read',
      title: 'Empowering Student Clubs & Collaborative Study Lounges',
      description:
        'University study groups and campus organizations use Eternal for shared note hubs and group video workshops.',
      gradientClass: 'from-cyan-900 via-blue-950 to-[#07050f]',
      previewType: 'community-students' as any,
    },
    {
      id: 'community-open-source',
      category: 'Community',
      date: 'Jul 20, 2026',
      readTime: '4 min read',
      title: 'Open Source Community: Developing Extensions and Bot Integrations',
      description:
        'How developer communities are building third-party bot automations and open plugins with our TypeScript SDK.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'community-opensource' as any,
    },
    {
      id: 'community-creator-grants',
      category: 'Community',
      date: 'Jul 14, 2026',
      readTime: '3 min read',
      title: 'Eternal Creator Grants 2026: Funding Independent Communities',
      description:
        'Awarding over $500,000 in micro-grants to grassroots creators, educators, and community builders.',
      gradientClass: 'from-amber-700 via-orange-900 to-[#07050f]',
      previewType: 'community-grants' as any,
    },
    {
      id: 'community-digital-wellness',
      category: 'Community',
      date: 'Jul 05, 2026',
      readTime: '3 min read',
      title: 'Digital Wellness & Mental Health: Fostering Healthy Digital Boundaries',
      description:
        'Building mindful social features: quiet hours, customizable notification batches, and algorithmic detox controls.',
      gradientClass: 'from-rose-900 via-pink-950 to-[#07050f]',
      previewType: 'community-wellness' as any,
    },
  ],
};

export const COMMUNITY_DATA_UK: CommunityCategoryData = {
  title: 'СПІЛЬНОТА',
  subtitle: 'Історії, досягнення та закулісся від серця та душі Eternal: нашої спільноти.',
  categoryName: 'Спільнота',
  heroArticle: {
    id: 'community-cleanup-report',
    category: 'Спільнота',
    date: '28 серп. 2026',
    readTime: '4 хв читання',
    title: 'ЗВІТ ПРО ІНСТРУМЕНТИ МОДЕРАЦІЇ ТА ПІДТРИМКИ АВТОРІВ СПІЛЬНОТИ',
    subtitle:
      'Eternal створив комплекс засобів контролю для авторів та проактивної модерації, щоб надати адміністраторам груп більше можливостей, підтримку підписників та зручний онбординг.',
    description:
      'Ознайомтеся з першим великим релізом інструментів безпеки та розвитку спільноти, включаючи автоматичні фільтри правил, систему ролей та аналітику авторів.',
    gradientClass: 'from-fuchsia-600 via-purple-700 to-indigo-900',
    previewType: 'community-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'community-creator-hubs',
      category: 'Спільнота',
      date: '22 серп. 2026',
      readTime: '3 хв читання',
      title: 'Хаби авторів та верифіковані бейджі: Підтримка незалежних творців',
      description:
        'Персональні бейджі спільноти, бонуси для підписників та зручні панелі аналітики для авторів контенту та стрімерів.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'community-spotlight' as any,
      isFeatured: true,
    },
    {
      id: 'community-art-festival',
      category: 'Спільнота',
      date: '18 серп. 2026',
      readTime: '3 хв читання',
      title: 'Вшанування цифрових митців: Творча сцена Eternal та живі джем-сесії',
      description:
        'Як тисячі музикантів і дизайнерів проводять інтерактивні воркшопи та живі трансляції на Eternal.',
      gradientClass: 'from-amber-600 via-pink-700 to-purple-900',
      previewType: 'community-music' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'community-moderation-summit',
      category: 'Спільнота',
      date: '12 серп. 2026',
      readTime: '4 хв читання',
      title: 'Глобальний саміт модерації: Безпечні простори та проактивні інструменти',
      description:
        'Автоматичний карантин підозрілих акаунтів, захист від спам-рейдів та розширені права модераторів.',
      gradientClass: 'from-emerald-800 via-teal-900 to-[#07050f]',
      previewType: 'community-mods' as any,
    },
    {
      id: 'community-gaming-guilds',
      category: 'Спільнота',
      date: '06 серп. 2026',
      readTime: '3 хв читання',
      title: 'Геймінг та кіберспортивні гільдії: Трансляції екрана з нульовою затримкою',
      description: 'Стрімінг ігор у 60 FPS без затримок та синхронний звук для командних турнірів.',
      gradientClass: 'from-violet-900 via-purple-950 to-[#07050f]',
      previewType: 'community-gaming' as any,
    },
    {
      id: 'community-student-spaces',
      category: 'Спільнота',
      date: '29 лип. 2026',
      readTime: '3 хв читання',
      title: 'Підтримка студентських клубів та спільних навчальних просторів',
      description:
        'Студентські групи використовують Eternal для спільних конспектів та групових відеоворкшопів.',
      gradientClass: 'from-cyan-900 via-blue-950 to-[#07050f]',
      previewType: 'community-students' as any,
    },
    {
      id: 'community-open-source',
      category: 'Спільнота',
      date: '20 лип. 2026',
      readTime: '4 хв читання',
      title: 'Open Source спільнота: Розробка плагінів та інтеграція ботів',
      description:
        'Спільноти розробників створюють автоматизації та відкриті плагіни за допомогою нашого SDK.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'community-opensource' as any,
    },
    {
      id: 'community-creator-grants',
      category: 'Спільнота',
      date: '14 лип. 2026',
      readTime: '3 хв читання',
      title: 'Гранти Eternal 2026: Фінансування незалежних спільнот',
      description:
        'Виділення понад $500,000 у формі мікрогрантів для талановитих авторів та викладачів.',
      gradientClass: 'from-amber-700 via-orange-900 to-[#07050f]',
      previewType: 'community-grants' as any,
    },
    {
      id: 'community-digital-wellness',
      category: 'Спільнота',
      date: '05 лип. 2026',
      readTime: '3 хв читання',
      title: 'Цифрове благополуччя та ментальне здоровʼя: Розумні межі спілкування',
      description:
        'Функції усвідомленого спілкування: години спокою, групування сповіщень та контроль цифрового балансу.',
      gradientClass: 'from-rose-900 via-pink-950 to-[#07050f]',
      previewType: 'community-wellness' as any,
    },
  ],
};

export const COMMUNITY_TRANSLATIONS: Record<string, CommunityCategoryData> = {
  English: COMMUNITY_DATA_EN,
  Українська: COMMUNITY_DATA_UK,
  Deutsch: COMMUNITY_DATA_EN,
  Español: COMMUNITY_DATA_EN,
  Français: COMMUNITY_DATA_EN,
};
