export interface CreatorArticle {
  id: string;
  category: 'eternal-101' | 'cultivating-community' | 'monetization' | 'safety';
  categoryLabel: string;
  title: string;
  description: string;
  readTime: string;
  imageSrc: string;
  badge?: string;
  details: {
    overview: string;
    keyTakeaways: string[];
    actionItems: string[];
  };
}

export interface CreatorFeaturedGuide {
  id: string;
  category: 'eternal-101' | 'cultivating-community';
  categoryLabel: string;
  title: string;
  description: string;
  readTime: string;
  imageSrc: string;
  badge?: string;
  details: {
    overview: string;
    keyTakeaways: string[];
    actionItems: string[];
  };
}

export interface CreatorsPageTranslation {
  hero: {
    title: string;
    subtitle: string;
    badge: string;
    ctaButton: string;
  };
  featuredSection: {
    title: string;
    subtitle: string;
  };
  exploreSection: {
    title: string;
    subtitle: string;
    loadMore: string;
    showLess: string;
    filterLabels: {
      all: string;
      eternal101: string;
      cultivatingCommunity: string;
      monetization: string;
      safety: string;
    };
  };
  featuredGuides: CreatorFeaturedGuide[];
  articles: CreatorArticle[];
  modal: {
    readGuide: string;
    close: string;
    keyTakeawaysTitle: string;
    actionStepsTitle: string;
  };
}

export const CREATORS_DATA_EN: CreatorsPageTranslation = {
  hero: {
    title: 'WELCOME CREATORS',
    subtitle: 'Learn how to grow your community and make the most of your Eternal server.',
    badge: 'Creator Academy',
    ctaButton: 'Start Creating',
  },
  featuredSection: {
    title: 'ESSENTIAL PLAYBOOKS',
    subtitle:
      'Step-by-step masterclasses designed to take your creator community from initial setup to thriving hub.',
  },
  exploreSection: {
    title: 'EXPLORE FURTHER',
    subtitle:
      'Deep dives, tactical frameworks, and real-world playbooks for modern creator operations.',
    loadMore: 'Load More',
    showLess: 'Show Less',
    filterLabels: {
      all: 'All',
      eternal101: 'Eternal 101',
      cultivatingCommunity: 'Cultivating Community',
      monetization: 'Monetization',
      safety: 'Safety & Growth',
    },
  },
  featuredGuides: [
    {
      id: 'creator-admin-101',
      category: 'eternal-101',
      categoryLabel: 'Eternal 101',
      title: 'Creator to Server Admin 101',
      description:
        'A comprehensive walkthrough on setting up your creator server, defining channel hierarchies, onboarding flows, and brand identity.',
      readTime: '5 min read',
      imageSrc: '/images/creators/bot-teacher-101.png',
      badge: 'Beginner',
      details: {
        overview:
          'Starting your own server can feel overwhelming. This guide breaks down the essential anatomy of a top-tier creator space: clean category structures, frictionless welcome screens, and dedicated announcement spaces.',
        keyTakeaways: [
          'Keep your initial channel count low to concentrate conversation.',
          'Establish a read-only announcements channel linked to your social feeds.',
          'Use clear role names with distinct visual colors for your core team.',
        ],
        actionItems: [
          'Create 3 primary categories: Welcome, Community Chat, and Content Hub.',
          'Configure permissions so new members can read rules before typing.',
          'Enable default notifications to mentions only to respect member attention.',
        ],
      },
    },
    {
      id: 'creator-admin-201',
      category: 'cultivating-community',
      categoryLabel: 'Cultivating Community',
      title: 'Creator to Server Admin 201',
      description:
        'Advanced community mechanics: automating moderator routines, scheduling community events, and maintaining sustained daily engagement.',
      readTime: '8 min read',
      imageSrc: '/images/creators/bot-teacher-201.png',
      badge: 'Advanced',
      details: {
        overview:
          'Once your foundation is built, cultivating a sticky community requires active rituals, trusted delegation, and intelligent automation.',
        keyTakeaways: [
          'Empower super-fans as community champions and moderators.',
          'Weekly recurring rituals (AMAs, watch parties, game nights) build habit loops.',
          'Automated bots reduce spam and reward active contributors dynamically.',
        ],
        actionItems: [
          'Draft a clear Code of Conduct and pinned moderation playbook.',
          'Schedule your first Stage Event or live creator Q&A session.',
          'Set up auto-roles for member tenure and server subscription supporters.',
        ],
      },
    },
  ],
  articles: [
    {
      id: 'must-read-articles',
      category: 'eternal-101',
      categoryLabel: 'Eternal 101',
      title: '5 Must-Read Articles for Beginners',
      description:
        'Curated selection of our highest-impact guides covering everything from permission matrices to custom emoji packs.',
      readTime: '4 min read',
      imageSrc: '/images/creators/coin-toss-3d.png',
      badge: 'Featured',
      details: {
        overview:
          'If you only have 20 minutes today, these five foundational articles will equip you with 80% of what you need to run a high-converting, safe creator space.',
        keyTakeaways: [
          'Permission safety prevents 99% of common security incidents.',
          'Visual brand polish (custom banners, custom soundboards) increases retention by 35%.',
          'A simple onboarding questionnaire personalizes member roles instantly.',
        ],
        actionItems: [
          'Review the server verification level settings in Server Settings.',
          'Upload 5 signature animated emojis representing your inside jokes.',
          'Add a welcome message banner with quick links to your latest videos.',
        ],
      },
    },
    {
      id: 'audience-vs-community',
      category: 'eternal-101',
      categoryLabel: 'Eternal 101',
      title: 'Audience versus Community',
      description:
        'Understanding the paradigm shift from one-to-many broadcasting to many-to-many genuine community connection.',
      readTime: '6 min read',
      imageSrc: '/images/creators/audience-circles-3d.png',
      details: {
        overview:
          'An audience watches you; a community talks to each other. Learn how to design spaces where your fans forge authentic friendships around shared passions.',
        keyTakeaways: [
          'Broadcast platforms create spectators; Eternal creates collaborators.',
          'Peer-to-peer discussion drives organic 24/7 activity even when you are offline.',
          'Highlighting community member achievements builds deep organic loyalty.',
        ],
        actionItems: [
          'Create interest-based channels (e.g. #creative-showcase, #setup-battles).',
          'Host a weekly community spotlight post highlighting a creative fan.',
          'Ask open-ended discussion questions in your general chat.',
        ],
      },
    },
    {
      id: 'content-strategy-community',
      category: 'cultivating-community',
      categoryLabel: 'Cultivating Community',
      title: 'Fitting Community in your Content Strategy',
      description:
        'How leading creators use Eternal to brainstorm video concepts, beta-test ideas, and gather live audience feedback.',
      readTime: '7 min read',
      imageSrc: '/images/creators/strategy-settings-3d.png',
      details: {
        overview:
          'Your community is your private focus group and creative sounding board. Discover proven workflows for integrating server feedback into your weekly content production cycle.',
        keyTakeaways: [
          'Early feedback loops eliminate guesswork in content production.',
          'Behind-the-scenes channels provide massive perceived value to fans.',
          'Exclusive sneak peeks reward your most loyal server members.',
        ],
        actionItems: [
          'Create a locked #insiders-lounge for top tier contributors.',
          'Run poll votes on upcoming video thumbnail concepts and topics.',
          'Acknowledge community contributors in your YouTube/Twitch credits.',
        ],
      },
    },
    {
      id: 'server-subscriptions',
      category: 'monetization',
      categoryLabel: 'Monetization',
      title: 'Server Subscriptions & Monetization',
      description:
        'Unlock predictable recurring revenue directly through your server with tiered perks, custom badges, and exclusive channels.',
      readTime: '5 min read',
      imageSrc: '/images/creators/monetization-vault-3d.png',
      badge: 'New',
      details: {
        overview:
          'Monetize your passion without third-party paywalls. Server Subscriptions let your audience support you seamlessly with native payment methods.',
        keyTakeaways: [
          'Offer exclusive perks: private voice lounges, custom badge flair, early access.',
          'Keep pricing tiers accessible: $4.99 and $9.99 tiers capture the widest base.',
          'Deliver consistent micro-perks over time to maintain low churn.',
        ],
        actionItems: [
          'Set up your payout bank account in Creator Monetization settings.',
          'Design 2-3 subscription tiers with clearly distinct perk lists.',
          'Host monthly supporter-only live Q&A sessions in private stage channels.',
        ],
      },
    },
    {
      id: 'onboarding-roles',
      category: 'cultivating-community',
      categoryLabel: 'Cultivating Community',
      title: 'Automating Roles & Welcome Onboarding',
      description:
        'Build smooth, zero-friction automated welcoming pipelines that guide newcomers straight to the channels they care about most.',
      readTime: '6 min read',
      imageSrc: '/images/creators/onboarding-roles-3d.png',
      details: {
        overview:
          'First impressions matter. Learn how to configure interactive welcome prompts that assign interest roles automatically, keeping channels organized.',
        keyTakeaways: [
          'Interactive onboarding reduces immediate server leave rates by 40%.',
          'Self-assignable roles prevent channel clutter for new members.',
          'Guided to-do lists help newcomers introduce themselves right away.',
        ],
        actionItems: [
          'Set up 3-5 simple questions in Community Onboarding settings.',
          'Attach automatic roles for gaming interests, notification alerts, and regions.',
          'Create a dedicated #introductions channel with friendly welcome bots.',
        ],
      },
    },
    {
      id: 'anti-raid-safety',
      category: 'safety',
      categoryLabel: 'Safety & Growth',
      title: 'Creator Safety & Anti-Raid Protection',
      description:
        'Protect your mental health and your community space with proactive automated moderation, verification gates, and raid shields.',
      readTime: '5 min read',
      imageSrc: '/images/creators/anti-raid-shield-3d.png',
      details: {
        overview:
          'Growth should never come at the expense of your peace of mind. Eternal equips creators with enterprise-grade automated protection tools.',
        keyTakeaways: [
          'Automated keyword filters block malicious links and harassment instantly.',
          'One-click Raid Shield locks incoming member joins during bad-faith attacks.',
          'Granular timeout tools isolate unruly accounts without causing public drama.',
        ],
        actionItems: [
          'Enable AutoMod with standard swear words and phishing blocklists.',
          'Require verified email/phone numbers for all new account joins.',
          'Designate emergency backup moderators with permission to trigger lockdown.',
        ],
      },
    },
  ],
  modal: {
    readGuide: 'Read Full Guide',
    close: 'Close',
    keyTakeawaysTitle: 'Key Takeaways',
    actionStepsTitle: 'Actionable Steps',
  },
};

export const CREATORS_DATA_UK: CreatorsPageTranslation = {
  hero: {
    title: 'ВІТАЄМО, КРІЕЙТОРИ!',
    subtitle:
      'Дізнайтеся, як розвивати свою спільноту та максимально ефективно використовувати свій сервер Eternal.',
    badge: 'Академія Кріейторів',
    ctaButton: 'Почати творити',
  },
  featuredSection: {
    title: 'ГОЛОВНІ ГАЙДИ ТА ПЛЕЙБУКИ',
    subtitle:
      'Покрокові майстер-класи, створені для того, щоб перетворити ваш сервер на процвітаючий центр спільноти.',
  },
  exploreSection: {
    title: 'ДОСЛІДЖУЙТЕ БІЛЬШЕ',
    subtitle:
      'Тактичні матеріали, практичні посібники та перевірені стратегії для сучасних авторів контенту.',
    loadMore: 'Показати більше',
    showLess: 'Згорнути',
    filterLabels: {
      all: 'Усі',
      eternal101: 'Eternal 101',
      cultivatingCommunity: 'Розвиток спільноти',
      monetization: 'Монетизація',
      safety: 'Безпека та ріст',
    },
  },
  featuredGuides: [
    {
      id: 'creator-admin-101',
      category: 'eternal-101',
      categoryLabel: 'Eternal 101',
      title: 'Від кріейтора до адміна сервера 101',
      description:
        'Повний посібник із налаштування сервера: ієрархія каналів, структура онбордингу та візуальна айдентика вашого бренду.',
      readTime: '5 хв читання',
      imageSrc: '/images/creators/bot-teacher-101.png',
      badge: 'Початківець',
      details: {
        overview:
          'Створення власного сервера може здатися складним. Цей гайд розбирає структуру найкращих просторів: чіткі категорії, легкий вхід та канали оголошень.',
        keyTakeaways: [
          'Не створюйте забагато каналів на початку, щоб зосередити спілкування.',
          'Зробіть канал новин лише для читання та підключіть до соцмереж.',
          'Використовуйте яскраві кольори ролей для команди модераторів.',
        ],
        actionItems: [
          'Створіть 3 головні категорії: Вітання, Спілкування та Контент.',
          'Налаштуйте права доступу, щоб новачки читали правила перед повідомленнями.',
          'Встановіть сповіщення сервера за замовчуванням тільки на згадки.',
        ],
      },
    },
    {
      id: 'creator-admin-201',
      category: 'cultivating-community',
      categoryLabel: 'Розвиток спільноти',
      title: 'Від кріейтора до адміна сервера 201',
      description:
        'Просунуті механіки: автоматизація рутини модераторів, розклад регулярних івентів і підтримка активності щодня.',
      readTime: '8 хв читання',
      imageSrc: '/images/creators/bot-teacher-201.png',
      badge: 'Просунутий',
      details: {
        overview:
          'Коли фундамент закладено, утримання аудиторії вимагає цікавих традицій, делегування та розумних ботів.',
        keyTakeaways: [
          'Залучайте активних підписників як лідерів спільноти та модераторів.',
          'Щотижневі події (AMA, спільні перегляди, турніри) формують звичку заходити частіше.',
          'Боти допомагають фільтрувати спам і автоматично нагороджувати активних учасників.',
        ],
        actionItems: [
          'Складіть чіткі Правила поведінки та закріпіть пам’ятку для команди.',
          'Заплануйте свій перший голосовий Stage Event або стрім із запитаннями.',
          'Увімкніть авто-ролі за стаж перебування на сервері.',
        ],
      },
    },
  ],
  articles: [
    {
      id: 'must-read-articles',
      category: 'eternal-101',
      categoryLabel: 'Eternal 101',
      title: '5 обов’язкових статей для початківців',
      description:
        'Добірка найважливіших інструкцій: від матриці прав до створення фірмових паків емодзі та саундбордів.',
      readTime: '4 хв читання',
      imageSrc: '/images/creators/coin-toss-3d.png',
      badge: 'Рекомендовано',
      details: {
        overview:
          'Якщо у вас є всього 20 хвилин, ці п’ять статей дадуть 80% необхідних знань для безпечного та привабливого простору.',
        keyTakeaways: [
          'Правильні права запобігають 99% інцидентів безпеки.',
          'Кастомні емодзі та банери підвищують залученість на 35%.',
          'Коротке опитування на вході миттєво персоналізує досвід учасника.',
        ],
        actionItems: [
          'Перевірте рівень верифікації в налаштуваннях сервера.',
          'Завантажте 5 фірмових анімованих емодзі.',
          'Додайте вітальний банер із посиланнями на ваші свіжі відео.',
        ],
      },
    },
    {
      id: 'audience-vs-community',
      category: 'eternal-101',
      categoryLabel: 'Eternal 101',
      title: 'Аудиторія проти Спільноти',
      description:
        'Розуміння переходу від трансляції контенту "один до багатьох" до щирого зв’язку та дружби всередині ком’юніті.',
      readTime: '6 хв читання',
      imageSrc: '/images/creators/audience-circles-3d.png',
      details: {
        overview:
          'Аудиторія просто дивиться на вас; спільнота спілкується між собою. Навчіться створювати простір, де люди знаходять друзів.',
        keyTakeaways: [
          'Стрімінгові платформи створюють глядачів, Eternal — однодумців.',
          'Обговорення між учасниками підтримують активність 24/7, навіть коли ви офлайн.',
          'Відзначення досягнень учасників створює міцну лояльність.',
        ],
        actionItems: [
          'Створіть канали за інтересами (наприклад, #творчість, #сетапи).',
          'Проводьте щотижневу рубрику вибору найкращого коментаря чи роботи фаната.',
          'Ставте відкриті запитання в загальному чаті.',
        ],
      },
    },
    {
      id: 'content-strategy-community',
      category: 'cultivating-community',
      categoryLabel: 'Розвиток спільноти',
      title: 'Інтеграція спільноти у вашу контент-стратегію',
      description:
        'Як провідні автори використовують Eternal для брейншторму ідей для роликів, тестування обкладинок та зворотного зв’язку.',
      readTime: '7 хв читання',
      imageSrc: '/images/creators/strategy-settings-3d.png',
      details: {
        overview:
          'Ваша спільнота — це фокус-група і творча команда. Дізнайтеся робочі процеси інтеграції фідбеку підписників у створення контенту.',
        keyTakeaways: [
          'Швидкий фідбек допомагає обирати лише топові теми для роликів.',
          'Канали за лаштунками дають шалену цінність для найпалкіших фанатів.',
          'Ексклюзивні тизери мотивують частіше відвідувати сервер.',
        ],
        actionItems: [
          'Створіть закритий канал #секретний-клуб для топ-підписників.',
          'Проводьте опитування щодо варіантів прев’ю та заголовків.',
          'Вказуйте імена помічників зі спільноти в титрах на YouTube / Twitch.',
        ],
      },
    },
    {
      id: 'server-subscriptions',
      category: 'monetization',
      categoryLabel: 'Монетизація',
      title: 'Підписки на сервер та Монетизація',
      description:
        'Отримуйте прогнозований щомісячний дохід безпосередньо через сервер завдяки платним рівням, значкам та ексклюзивним каналам.',
      readTime: '5 хв читання',
      imageSrc: '/images/creators/monetization-vault-3d.png',
      badge: 'Нове',
      details: {
        overview:
          'Монетизуйте улюблену справу без сторонніх сервісів. Підписки на сервер дають підписникам зручний спосіб підтримати автора.',
        keyTakeaways: [
          'Надавайте унікальні бонуси: приватні голосові кімнати, спеціальні значки, ранній доступ.',
          'Зробіть доступні тарифи для максимального охоплення аудиторії.',
          'Регулярно дякуйте спонсорам для збереження підписок.',
        ],
        actionItems: [
          'Підключіть рахунок для виплат у налаштуваннях монетизації.',
          'Створіть 2-3 рівні підтримки з чітким описом переваг.',
          'Проводьте щомісячні закриті Stage-стріми для платних учасників.',
        ],
      },
    },
    {
      id: 'onboarding-roles',
      category: 'cultivating-community',
      categoryLabel: 'Розвиток спільноти',
      title: 'Автоматизація ролей та легкий онбординг',
      description:
        'Створюйте плавний інтерактивний процес знайомства, який автоматично спрямовує новачка до найцікавіших для нього тем.',
      readTime: '6 хв читання',
      imageSrc: '/images/creators/onboarding-roles-3d.png',
      details: {
        overview:
          'Перше враження вирішує все. Налаштуйте інтерактивні запитання на вході для автоматичного вибору ролей та каналів.',
        keyTakeaways: [
          'Зручний онбординг знижує вихід із сервера в перші хвилини на 40%.',
          'Самостійний вибір ролей захищає учасника від непотрібного шуму.',
          'Чіткі покрокові підказки допомагають одразу написати перше привітання.',
        ],
        actionItems: [
          'Налаштуйте 3-5 простих запитань в Онбордингу спільноти.',
          'Прив’яжіть автоматичні ролі за іграми, сповіщеннями та мовами.',
          'Створіть окремий канал #знайомство з привітними ботами.',
        ],
      },
    },
    {
      id: 'anti-raid-safety',
      category: 'safety',
      categoryLabel: 'Безпека та ріст',
      title: 'Безпека автора та захист від рейдів',
      description:
        'Захистіть свій душевний спокій та простір спільноти за допомогою автоматичної модерації, бар’єрів верифікації та захисту від рейдів.',
      readTime: '5 хв читання',
      imageSrc: '/images/creators/anti-raid-shield-3d.png',
      details: {
        overview:
          'Зростання ніколи не повинно відбуватися за рахунок вашого комфорту. Eternal надає інструменти автоматичного захисту корпоративного рівня.',
        keyTakeaways: [
          'Фільтри AutoMod миттєво блокують шкідливі посилання та спам.',
          'Raid Shield в один клік зупиняє масові напливи ботів під час атак.',
          'Таймаути дозволяють ізолювати порушників без зайвого шуму.',
        ],
        actionItems: [
          'Увімкніть AutoMod зі списками блокування фішингу та образ.',
          'Вимагайте підтверджений email/номер телефону для нових акаунтів.',
          'Призначте надійних заступників із правом вмикати захист від рейдів.',
        ],
      },
    },
  ],
  modal: {
    readGuide: 'Читати повний гайд',
    close: 'Закрити',
    keyTakeawaysTitle: 'Ключові висновки',
    actionStepsTitle: 'Практичні кроки',
  },
};
