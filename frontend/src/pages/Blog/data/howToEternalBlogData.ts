import { BlogPost } from './blogData';

export interface HowToEternalBlogCategoryData {
  title: string;
  subtitle: string;
  heroArticle: BlogPost;
  featuredPosts: BlogPost[];
  explorePosts: BlogPost[];
  categoryName: string;
}

export const HOW_TO_ETERNAL_BLOG_DATA_EN: HowToEternalBlogCategoryData = {
  title: 'HOW TO ETERNAL',
  subtitle: 'Tutorials and guides to help with Eternal and other topics of interest.',
  categoryName: 'How to Eternal',
  heroArticle: {
    id: 'howto-desktop-notifications',
    category: 'How to Eternal',
    date: 'Aug 29, 2026',
    readTime: '4 min read',
    title: 'HOW TO MANAGE YOUR ETERNAL DESKTOP NOTIFICATIONS & PRIVACY: A COMPLETE GUIDE',
    subtitle:
      'Not getting pinged for the conversations you wanna know about, or want distraction-free quiet hours? This guide walks through channel overrides, mention badges, focus modes, and custom ringtones.',
    description:
      'Master your notification stream with granular server mutes, keyword alerts, smart desktop popups, and quiet hours scheduled to your daily routine.',
    gradientClass: 'from-[#1e1347] via-[#120a30] to-[#07050f]',
    previewType: 'howto-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'howto-custom-themes',
      category: 'How to Eternal',
      date: 'Aug 25, 2026',
      readTime: '3 min read',
      title: 'How to Customize Themes and Chat Backgrounds: A Complete Styling Guide',
      description:
        'Personalize your client with dynamic gradient themes, glassmorphism blur intensity, custom chat bubbles, and OLED pure black mode.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'howto-themes' as any,
      isFeatured: true,
    },
    {
      id: 'howto-display-settings',
      category: 'How to Eternal',
      date: 'Aug 20, 2026',
      readTime: '3 min read',
      title: 'Making Eternal on Desktop Look Just Right: Display Settings to Ease the Eyes',
      description:
        'Fine-tune chat font scaling, compact message spacing, high contrast toggles, and adaptive blue light reduction filters.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'howto-display' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'howto-custom-emojis',
      category: 'How to Eternal',
      date: 'Aug 15, 2026',
      readTime: '3 min read',
      title: 'How to Create and Upload Custom Animated Emojis on Eternal',
      description:
        'A quick walkthrough on uploading custom GIF reactions, organizing sticker packs, and setting role-based emoji permissions.',
      gradientClass: 'from-pink-900 via-purple-950 to-[#07050f]',
      previewType: 'howto-emojis' as any,
    },
    {
      id: 'howto-link-gaming',
      category: 'How to Eternal',
      date: 'Aug 09, 2026',
      readTime: '3 min read',
      title: 'How to Link Eternal to Your Gaming Accounts & Show Rich Presence',
      description:
        'Connect Steam, Xbox, PlayStation, and Epic Games to broadcast real-time game status and invite friends to lobbies.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'howto-presence' as any,
    },
    {
      id: 'howto-share-audio',
      category: 'How to Eternal',
      date: 'Aug 02, 2026',
      readTime: '3 min read',
      title: 'How to Stream Music and Host Real-Time Audio Lounges with Friends',
      description:
        'Set up high-bitrate stereo audio streaming, noise suppression thresholds, and collaborative listening sessions.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'howto-audio' as any,
    },
    {
      id: 'howto-create-guild',
      category: 'How to Eternal',
      date: 'Jul 26, 2026',
      readTime: '4 min read',
      title: 'A Beginner’s Guide to Building Your First Community Guild from Scratch',
      description:
        'Learn how to structure categories, create role hierarchies, set up welcome gates, and automate auto-moderation.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'howto-guild' as any,
    },
    {
      id: 'howto-optimize-storage',
      category: 'How to Eternal',
      date: 'Jul 18, 2026',
      readTime: '3 min read',
      title: 'Managing Storage & Data Usage: Optimizing Cached Media on Desktop & Mobile',
      description:
        'Free up gigabytes of drive space by configuring automatic cache cleanup schedules and selective media auto-download.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'howto-storage' as any,
    },
    {
      id: 'howto-account-security',
      category: 'How to Eternal',
      date: 'Jul 10, 2026',
      readTime: '4 min read',
      title: 'Two-Factor Authentication & Key Backups: Keeping Your Account Secure',
      description:
        'Enable hardware security keys (FIDO2), authenticator app 2FA, and store encrypted recovery passkeys safely.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'howto-2fa' as any,
    },
  ],
};

export const HOW_TO_ETERNAL_BLOG_DATA_UK: HowToEternalBlogCategoryData = {
  title: 'ЯК КОРИСТУВАТИСЯ ETERNAL',
  subtitle: 'Посібники та інструкції, які допоможуть розібратися з Eternal та цікавими функціями.',
  categoryName: 'Як користуватися Eternal',
  heroArticle: {
    id: 'howto-desktop-notifications',
    category: 'Як користуватися Eternal',
    date: '29 серп. 2026',
    readTime: '4 хв читання',
    title: 'ЯК НАЛАШТУВАТИ СПОВІЩЕННЯ ТА ПРИВАТНІСТЬ У ДОДАТКУ ДЛЯ ПК: ПОВНИЙ ГАЙД',
    subtitle:
      'Не отримуєте важливі сповіщення чи хочете режим фокусування без відволікань? Цей посібник розповість про індивідуальні налаштування каналів, бейджі згадок та розклад тиші.',
    description:
      'Керуйте потоком сповіщень: персональні налаштування звуків, приглушення серверів та заплановані години спокою під ваш щоденний графік.',
    gradientClass: 'from-[#1e1347] via-[#120a30] to-[#07050f]',
    previewType: 'howto-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'howto-custom-themes',
      category: 'Як користуватися Eternal',
      date: '25 серп. 2026',
      readTime: '3 хв читання',
      title: 'Як налаштувати персональні теми та фони чату: Повний гайд зі стилю',
      description:
        'Персоналізуйте зовнішній вигляд: градієнтні теми, налаштування ефекту скла, кастомні бульбашки повідомлень та режим чистого чорного для OLED.',
      gradientClass: 'from-purple-900 via-indigo-950 to-[#07050f]',
      previewType: 'howto-themes' as any,
      isFeatured: true,
    },
    {
      id: 'howto-display-settings',
      category: 'Як користуватися Eternal',
      date: '20 серп. 2026',
      readTime: '3 хв читання',
      title: 'Зручний вигляд Eternal на ПК: Налаштування дисплея для комфорту очей',
      description:
        'Налаштуйте розмір шрифту повідомлень, компактний режим інтерфейсу, високу контрастність та фільтр синього світла.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'howto-display' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'howto-custom-emojis',
      category: 'Як користуватися Eternal',
      date: '15 серп. 2026',
      readTime: '3 хв читання',
      title: 'Як створювати та завантажувати анімовані емодзі на Eternal',
      description:
        'Швидка інструкція із завантаження користувацьких GIF-стікерів, організації наборів та налаштування прав доступу до емодзі.',
      gradientClass: 'from-pink-900 via-purple-950 to-[#07050f]',
      previewType: 'howto-emojis' as any,
    },
    {
      id: 'howto-link-gaming',
      category: 'Як користуватися Eternal',
      date: '09 серп. 2026',
      readTime: '3 хв читання',
      title: 'Як підключити ігрові акаунти та показувати Rich Presence у грі',
      description:
        'Підключайте Steam, PlayStation та Xbox, щоб транслювати свій статус у грі та запрошувати друзів у спільні матчі.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'howto-presence' as any,
    },
    {
      id: 'howto-share-audio',
      category: 'Як користуватися Eternal',
      date: '02 серп. 2026',
      readTime: '3 хв читання',
      title: 'Як транслювати музику та проводити живі аудіокімнати з друзями',
      description:
        'Налаштування стереозвуку високої якості, порогу шумопоглинання та спільних сеансів прослуховування аудіо.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'howto-audio' as any,
    },
    {
      id: 'howto-create-guild',
      category: 'Як користуватися Eternal',
      date: '26 лип. 2026',
      readTime: '4 хв читання',
      title: 'Гайд для початківців: Створення власної гільдії спільноти з нуля',
      description:
        'Дізнайтеся, як організувати категорії каналів, створити ролі учасників та налаштувати автоматичну модерацію.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'howto-guild' as any,
    },
    {
      id: 'howto-optimize-storage',
      category: 'Як користуватися Eternal',
      date: '18 лип. 2026',
      readTime: '3 хв читання',
      title: 'Керування пам’яттю та трафіком: Очищення кешу на ПК та смартфоні',
      description:
        'Звільніть гігабайти пам’яті за допомогою налаштування автоматичного очищення кешу та обмеження завантаження медіа.',
      gradientClass: 'from-amber-900 via-orange-950 to-[#07050f]',
      previewType: 'howto-storage' as any,
    },
    {
      id: 'howto-account-security',
      category: 'Як користуватися Eternal',
      date: '10 лип. 2026',
      readTime: '4 хв читання',
      title: 'Двофакторна автентифікація (2FA) та резервні ключі для захисту акаунта',
      description:
        'Увімкніть апаратні ключі безпеки FIDO2, 2FA через додатки автентифікації та збережіть зашифровані ключі відновлення.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'howto-2fa' as any,
    },
  ],
};

export const HOW_TO_ETERNAL_BLOG_TRANSLATIONS: Record<string, HowToEternalBlogCategoryData> = {
  English: HOW_TO_ETERNAL_BLOG_DATA_EN,
  Українська: HOW_TO_ETERNAL_BLOG_DATA_UK,
  Deutsch: HOW_TO_ETERNAL_BLOG_DATA_EN,
  Español: HOW_TO_ETERNAL_BLOG_DATA_EN,
  Français: HOW_TO_ETERNAL_BLOG_DATA_EN,
};
