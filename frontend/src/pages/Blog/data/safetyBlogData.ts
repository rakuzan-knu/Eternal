import { BlogPost } from './blogData';

export interface SafetyBlogCategoryData {
  title: string;
  subtitle: string;
  heroArticle: BlogPost;
  featuredPosts: BlogPost[];
  explorePosts: BlogPost[];
  categoryName: string;
}

export const SAFETY_BLOG_DATA_EN: SafetyBlogCategoryData = {
  title: 'POLICY & SAFETY',
  subtitle:
    'General tips and insights from Eternal’s Policy & Safety teams who enable users and communities to be safe on the platform.',
  categoryName: 'Policy & Safety',
  heroArticle: {
    id: 'safety-defense-shield',
    category: 'Policy & Safety',
    date: 'Aug 28, 2026',
    readTime: '5 min read',
    title: 'HOW ETERNAL DEFENSE SHIELD IS ADVANCING ONLINE TRUST & SAFETY',
    subtitle:
      'The threat landscape online has shifted dramatically. Many online platforms are left to reinvent safety tools from scratch. That’s why Eternal open-sources battle-tested AI moderation engines and transparent enforcement frameworks.',
    description:
      'Explore how our decentralized threat intelligence, real-time automated raid prevention, and proactive content filters protect millions of servers daily without compromising user privacy.',
    gradientClass: 'from-[#1e1445] via-[#100b2e] to-[#07050f]',
    previewType: 'safety-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'safety-age-assurance',
      category: 'Policy & Safety',
      date: 'Aug 22, 2026',
      readTime: '4 min read',
      title: 'Getting Global Age Assurance Right: What We Learned and What’s Changing',
      description:
        'A comprehensive overview of our zero-knowledge age verification protocols, privacy-preserving checks, and enhanced default safety protections for teens.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'safety-assurance' as any,
      isFeatured: true,
    },
    {
      id: 'safety-guardian-sentinel',
      category: 'Policy & Safety',
      date: 'Aug 16, 2026',
      readTime: '4 min read',
      title: 'Eternal Announces “Guardian” and “Sentinel”: Free, Open-Source Safety Infrastructure',
      description:
        'We are open-sourcing our machine learning models for detecting harmful coordinated behavior, image spoofing, and toxic spam in real time.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'safety-guardian' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'safety-wellbeing',
      category: 'Policy & Safety',
      date: 'Aug 11, 2026',
      readTime: '3 min read',
      title:
        'Mental Health & Eternal: Promoting Well-Being, Balance, and Mindfulness All Year Long',
      description:
        'How our product features like scheduled breaks, notification downtime, and direct crisis helpline integrations foster positive digital habits.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'safety-wellbeing' as any,
    },
    {
      id: 'safety-transparency-report',
      category: 'Policy & Safety',
      date: 'Aug 04, 2026',
      readTime: '5 min read',
      title: 'Global Transparency & Enforcement Report: Key Policy Updates and Trends',
      description:
        'A detailed breakdown of law enforcement requests, automated content takedowns, spam mitigation stats, and appeals outcomes in Q2 2026.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'safety-transparency' as any,
    },
    {
      id: 'safety-matrix-architecture',
      category: 'Policy & Safety',
      date: 'Jul 28, 2026',
      readTime: '4 min read',
      title: 'How We’re Evolving Our Safety Architecture for High-Capacity Voice & Video Rooms',
      description:
        'Deploying client-side audio watermarking, encrypted anomaly detection, and instant host moderation tools across 10,000-person stages.',
      gradientClass: 'from-blue-900 via-sky-950 to-[#07050f]',
      previewType: 'safety-matrix' as any,
    },
    {
      id: 'safety-youth-center',
      category: 'Policy & Safety',
      date: 'Jul 20, 2026',
      readTime: '3 min read',
      title: 'Supporting Youth Safety: Introducing the Eternal Family Center & Parental Controls',
      description:
        'Giving parents transparency into friend lists and server memberships while maintaining teen autonomy and encrypted private chats.',
      gradientClass: 'from-amber-900 via-yellow-950 to-[#07050f]',
      previewType: 'safety-youth' as any,
    },
    {
      id: 'safety-genz-boundaries',
      category: 'Policy & Safety',
      date: 'Jul 12, 2026',
      readTime: '3 min read',
      title: 'Gen Z Mental Health: Empowering Healthy Communication Boundaries in Group Chats',
      description:
        'Best practices for setting boundary rules, handling peer conflict, and utilizing our silent read receipts and ghost ping blockers.',
      gradientClass: 'from-pink-900 via-purple-950 to-[#07050f]',
      previewType: 'safety-genz' as any,
    },
    {
      id: 'safety-antiraid-wizard',
      category: 'Policy & Safety',
      date: 'Jul 05, 2026',
      readTime: '4 min read',
      title: 'Defending Communities Against Automated Raids, Scams, and Malicious Links',
      description:
        'How AutoMod heuristics and CAPTCHA challenge gates isolate bad actors in less than 50 milliseconds before any harm reaches members.',
      gradientClass: 'from-indigo-900 via-slate-950 to-[#07050f]',
      previewType: 'safety-antiraid' as any,
    },
  ],
};

export const SAFETY_BLOG_DATA_UK: SafetyBlogCategoryData = {
  title: 'ПОЛІТИКА ТА БЕЗПЕКА',
  subtitle:
    'Поради та інсайти від команд політики та безпеки Eternal, які забезпечують комфорт і захист користувачів та спільнот на платформі.',
  categoryName: 'Політика та безпека',
  heroArticle: {
    id: 'safety-defense-shield',
    category: 'Політика та безпека',
    date: '28 серп. 2026',
    readTime: '5 хв читання',
    title: 'ЯК ETERNAL DEFENSE SHIELD РОЗВИВАЄ БЕЗПЕКУ ТА ДОВІРУ В МЕРЕЖІ',
    subtitle:
      'Ландшафт загроз в інтернеті швидко змінюється. Багатьом платформам доводиться створювати інструменти безпеки з нуля. Саме тому Eternal ділиться відкритим кодом AI-модерації та прозорими правилами захисту.',
    description:
      'Дізнайтеся, як децентралізовані системи моніторингу загроз, автоматичний захист від спам-рейдів та фільтри контенту захищають мільйони серверів щодня зі збереженням повної конфіденційності.',
    gradientClass: 'from-[#1e1445] via-[#100b2e] to-[#07050f]',
    previewType: 'safety-hero' as any,
    isFeatured: true,
  },
  featuredPosts: [
    {
      id: 'safety-age-assurance',
      category: 'Політика та безпека',
      date: '22 серп. 2026',
      readTime: '4 хв читання',
      title: 'Глобальні стандарти вікової верифікації: Що ми вивчили та що змінюється',
      description:
        'Детальний огляд протоколів вікової перевірки з нульовим розголошенням (Zero-Knowledge) та надійний захист підлітків за замовчуванням.',
      gradientClass: 'from-indigo-900 via-purple-950 to-[#07050f]',
      previewType: 'safety-assurance' as any,
      isFeatured: true,
    },
    {
      id: 'safety-guardian-sentinel',
      category: 'Політика та безпека',
      date: '16 серп. 2026',
      readTime: '4 хв читання',
      title:
        'Eternal представляє “Guardian” і “Sentinel”: Безкоштовну відкриту інфраструктуру безпеки',
      description:
        'Ми відкриваємо вихідний код наших ML-моделей для миттєвого виявлення скоординованих атак, спаму та шкідливого контенту в реальному часі.',
      gradientClass: 'from-blue-900 via-indigo-950 to-[#07050f]',
      previewType: 'safety-guardian' as any,
      isFeatured: true,
    },
  ],
  explorePosts: [
    {
      id: 'safety-wellbeing',
      category: 'Політика та безпека',
      date: '11 серп. 2026',
      readTime: '3 хв читання',
      title: 'Ментальне здоров’я та Eternal: Підтримка цифрового балансу та гармонії цілий рік',
      description:
        'Як функції запланованого відпочинку, години спокою та швидкий доступ до ліній психологічної підтримки допомагають зберігати баланс.',
      gradientClass: 'from-emerald-900 via-teal-950 to-[#07050f]',
      previewType: 'safety-wellbeing' as any,
    },
    {
      id: 'safety-transparency-report',
      category: 'Політика та безпека',
      date: '04 серп. 2026',
      readTime: '5 хв читання',
      title: 'Звіт про прозорість та дотримання правил: Ключові оновлення політик та статистика',
      description:
        'Аналіз запитів, результатів автоматичного блокування спам-ботів та статистика розгляду апеляцій користувачів за другий квартал 2026 року.',
      gradientClass: 'from-purple-900 via-violet-950 to-[#07050f]',
      previewType: 'safety-transparency' as any,
    },
    {
      id: 'safety-matrix-architecture',
      category: 'Політика та безпека',
      date: '28 лип. 2026',
      readTime: '4 хв читання',
      title: 'Еволюція архітектури безпеки для голосових та відеокімнат великої місткості',
      description:
        'Впровадження клієнтських водяних знаків аудіо, аналізу аномалій та швидких інструментів модератора для сцен на 10 000+ учасників.',
      gradientClass: 'from-blue-900 via-sky-950 to-[#07050f]',
      previewType: 'safety-matrix' as any,
    },
    {
      id: 'safety-youth-center',
      category: 'Політика та безпека',
      date: '20 лип. 2026',
      readTime: '3 хв читання',
      title: 'Безпека молоді: Представляємо Сімейний центр Eternal та батьківський контроль',
      description:
        'Прозорість для батьків щодо списків друзів і серверів зі збереженням повної приватності та шифрування особистих листувань.',
      gradientClass: 'from-amber-900 via-yellow-950 to-[#07050f]',
      previewType: 'safety-youth' as any,
    },
    {
      id: 'safety-genz-boundaries',
      category: 'Політика та безпека',
      date: '12 лип. 2026',
      readTime: '3 хв читання',
      title: 'Ментальне здоров’я Gen Z: Встановлення здорових меж спілкування в групових чатах',
      description:
        'Практичні поради щодо вирішення конфліктів, налаштувань тихих сповіщень та блокування фантомних згадок у спільнотах.',
      gradientClass: 'from-pink-900 via-purple-950 to-[#07050f]',
      previewType: 'safety-genz' as any,
    },
    {
      id: 'safety-antiraid-wizard',
      category: 'Політика та безпека',
      date: '05 лип. 2026',
      readTime: '4 хв читання',
      title: 'Захист спільнот від автоматизованих спам-рейдів, фішингу та підозрілих посилань',
      description:
        'Як евристичні алгоритми AutoMod та динамічні капчі нейтралізують ботів за менш ніж 50 мілісекунд до контакту з учасниками.',
      gradientClass: 'from-indigo-900 via-slate-950 to-[#07050f]',
      previewType: 'safety-antiraid' as any,
    },
  ],
};

export const SAFETY_BLOG_TRANSLATIONS: Record<string, SafetyBlogCategoryData> = {
  English: SAFETY_BLOG_DATA_EN,
  Українська: SAFETY_BLOG_DATA_UK,
  Deutsch: SAFETY_BLOG_DATA_EN,
  Español: SAFETY_BLOG_DATA_EN,
  Français: SAFETY_BLOG_DATA_EN,
};
