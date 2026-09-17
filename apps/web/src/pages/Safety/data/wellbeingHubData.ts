export interface WellbeingResource {
  id: string;
  title: string;
  description: string;
  actionType: 'button' | 'badge' | 'link';
  actionLabel?: string;
  badgeText?: string;
  linkUrl?: string;
  colorTheme: 'emerald' | 'purple' | 'cyan' | 'rose';
  hasGemIllustration?: boolean;
}

export interface WellbeingPrinciple {
  id: string;
  iconType: 'gaming' | 'agency' | 'safety' | 'empathy';
  title: string;
  description: string;
}

export interface WellbeingArticleCard {
  id: string;
  category: string;
  title: string;
  summary: string;
  thumbnailType:
    'banter' | 'communities' | 'on-the-road' | 'boundaries' | 'parent-guide' | 'mindfulness';
}

export interface WellbeingHubTranslation {
  hero: {
    title: string;
    subtitle: string;
  };
  resourcesSection: {
    title: string;
    subtitle: string;
    resources: WellbeingResource[];
  };
  principlesSection: {
    title: string;
    subtitle: string;
    principles: WellbeingPrinciple[];
  };
  moreResourcesSection: {
    title: string;
    articles: WellbeingArticleCard[];
    readMoreLabel: string;
  };
  globalSupportModal: {
    title: string;
    subtitle: string;
    closeBtn: string;
    regions: Array<{
      region: string;
      services: Array<{
        name: string;
        contact: string;
        desc: string;
      }>;
    }>;
  };
  quoteSection: {
    quote: string;
    author: string;
    authorRole: string;
  };
  parentHubSection: {
    heading: string;
    description: string;
    ctaButton: string;
    link: string;
  };
  teenCharterSection: {
    heading: string;
    description: string;
    ctaButton: string;
    link: string;
  };
}

export const WELLBEING_HUB_EN: WellbeingHubTranslation = {
  hero: {
    title: 'ETERNAL WELLBEING HUB',
    subtitle:
      'Discover resources for ways to protect your wellbeing or to support your teen’s mental health online.',
  },
  resourcesSection: {
    title: 'WELLBEING & EMPOWERMENT RESOURCES',
    subtitle:
      'We’re committed to helping people build the skills and confidence to navigate online spaces thoughtfully.',
    resources: [
      {
        id: 'players-guide',
        title: 'Eternal Player’s Guide',
        description:
          'The Eternal Player’s Guide is your go-to resource for learning how to communicate, connect, and show up well online.',
        actionType: 'button',
        actionLabel: 'View the Guide',
        colorTheme: 'emerald',
      },
      {
        id: 'crisis-text-line',
        title: 'Crisis Text Line',
        description:
          'US and international users can connect with a live volunteer Crisis Counselor at Crisis Text Line: a free, 24/7, confidential text-based mental health support service in both English and Spanish.',
        actionType: 'badge',
        badgeText: 'Text ETERNAL to 741741',
        colorTheme: 'emerald',
        hasGemIllustration: true,
      },
      {
        id: 'throughline',
        title: 'ThroughLine',
        description:
          'With a directory of crisis support in over 100+ countries, users can find free, confidential support in their country via chat, text, or phone.',
        actionType: 'button',
        actionLabel: 'Find Local Support',
        colorTheme: 'emerald',
      },
      {
        id: 'research-paper',
        title: 'Promoting Well-Being Through Online Communities: Understanding User Mental Health',
        description:
          'A comprehensive study examining the mental health benefits of online friendships and gaming spaces, developed alongside adolescent psychologists.',
        actionType: 'button',
        actionLabel: 'Read Research Insights',
        colorTheme: 'emerald',
      },
    ],
  },
  principlesSection: {
    title: 'WELLBEING & EMPOWERMENT PRINCIPLES',
    subtitle:
      'We believe digital spaces can be sources of connection, growth, and belonging for everyone on Eternal. With Boston Children’s Hospital’s Digital Wellness Lab, we’ve established four principles that guide our mission across the breadth of our work.',
    principles: [
      {
        id: 'gaming-connection',
        iconType: 'gaming',
        title: 'Gaming Fosters Meaningful Connection',
        description:
          'We recognize that gaming and online communities foster transferable life skills and meaningful social connection. We understand virtual interactions support mental wellbeing and healthy emotional regulation. We inform design for authentic relationship-building that recognizes different social preferences, while understanding gaming culture challenges and working with internal teams to address them.',
      },
      {
        id: 'agency-transparency',
        iconType: 'agency',
        title: 'Championing User Agency & Transparency',
        description:
          'Through research, partnerships, and user voice, we inform policies, programs, and resources that respect user agency. We balance autonomy and safety, reflecting developmental needs and cultural contexts. We maintain transparent communication about our decisions and their impact, creating pathways for intergenerational understanding that support guardian-teen relationships.',
      },
      {
        id: 'safety-by-design',
        iconType: 'safety',
        title: 'Safety by Design & Proactive Protection',
        description:
          'Mental health and emotional safety are integrated into product architecture from day one. We build thoughtful default settings, automated harassment filters, and gentle reminder checkpoints that protect teen serenity without sacrificing fun.',
      },
      {
        id: 'empathy-spaces',
        iconType: 'empathy',
        title: 'Empathy-Driven Community Spaces',
        description:
          'Creating culture where vulnerability, mutual aid, and active listening flourish. We equip moderators with de-escalation tools to nurture supportive environments where everyone feels valued and respected.',
      },
    ],
  },
  moreResourcesSection: {
    title: 'MORE RESOURCES',
    readMoreLabel: 'Read Article',
    articles: [
      {
        id: 'ecpat-banter',
        category: 'Safety',
        title: 'ECPAT x Eternal: What to Do When Online Banter Goes Too Far',
        summary:
          'Practical advice for recognizing the boundary between playful teasing and harmful harassment among friends online.',
        thumbnailType: 'banter',
      },
      {
        id: 'better-communities',
        category: 'Safety',
        title: 'Better Communities Start With Us: Eternal Partners with Youth Advocates',
        summary:
          'How young community leaders are shaping anti-cyberbullying tools and fostering inclusive server moderation.',
        thumbnailType: 'communities',
      },
      {
        id: 'teen-road',
        category: 'Safety',
        title: 'Teen Wellbeing On The Road: Learning and Building Together',
        summary:
          'Highlights from our global teen workshops on building healthy screen time habits and maintaining genuine friendships.',
        thumbnailType: 'on-the-road',
      },
      {
        id: 'digital-boundaries',
        category: 'Mental Health',
        title: 'Digital Boundaries: Taking a Healthy Break from Voice & Chat',
        summary:
          'Step-by-step guidance on setting status messages, scheduling downtime, and managing FOMO (fear of missing out).',
        thumbnailType: 'boundaries',
      },
      {
        id: 'parent-guide-emotions',
        category: 'Family & Youth',
        title: 'A Parent’s Guide to Supporting Teen Emotional Regulation Online',
        summary:
          'Constructive conversation starters for families to discuss online challenges, gaming balance, and digital wellbeing.',
        thumbnailType: 'parent-guide',
      },
      {
        id: 'mindfulness-gaming',
        category: 'Wellbeing',
        title: 'Mindfulness in Gaming: Turning Multiplayer Play into Stress Relief',
        summary:
          'How cooperative gaming and shared creative servers can serve as therapeutic relaxation after a long school day.',
        thumbnailType: 'mindfulness',
      },
    ],
  },
  globalSupportModal: {
    title: 'Global Mental Health & Crisis Support Directory',
    subtitle:
      'If you or someone you know is going through a tough time, free and confidential support is available 24/7.',
    closeBtn: 'Close Directory',
    regions: [
      {
        region: 'Ukraine (Україна)',
        services: [
          {
            name: 'Національна гаряча лінія для дітей та молоді',
            contact: '0 800 500 225 або 116 111 (безкоштовно)',
            desc: 'Психологічна та правова підтримка для дітей, підлітків та батьків.',
          },
          {
            name: 'Гаряча лінія запобігання самогубствам Lifeline Ukraine',
            contact: '7333 (цілодобово)',
            desc: 'Національна лінія психологічної підтримки та кризової допомоги.',
          },
        ],
      },
      {
        region: 'United States & Canada',
        services: [
          {
            name: 'Crisis Text Line',
            contact: 'Text ETERNAL to 741741',
            desc: 'Free, 24/7, confidential support via text message.',
          },
          {
            name: 'Suicide & Crisis Lifeline',
            contact: 'Call or Text 988',
            desc: '24/7 free and confidential support for people in distress.',
          },
          {
            name: 'The Trevor Project (LGBTQ Youth)',
            contact: 'Call 1-866-488-7386 or Text START to 678-678',
            desc: 'Crisis intervention and suicide prevention for LGBTQ young people.',
          },
        ],
      },
      {
        region: 'United Kingdom & Europe',
        services: [
          {
            name: 'Shout Crisis Text Line (UK)',
            contact: 'Text SHOUT to 85258',
            desc: 'Free, confidential 24/7 mental health text support service in the UK.',
          },
          {
            name: 'Childline (UK)',
            contact: 'Call 0800 1111',
            desc: 'Free and confidential helpline for children and young people under 19.',
          },
          {
            name: 'European Youth Helpline',
            contact: 'Call 116 111 (Across EU)',
            desc: 'Helpline for children and adolescents in emotional distress across EU states.',
          },
        ],
      },
    ],
  },
  quoteSection: {
    quote:
      '“Family Center provides parents with what they need to help guide their teen’s use of Eternal without being too invasive. It’s like the physical world where you know who your kids are hanging out with and where they’re going but not listening in on their conversations or micromanaging their relationships. Tools like Family Center can help parents help their teens develop the habits and critical thinking skills that apply not only to Eternal but all of life.”',
    author: 'Larry Magid',
    authorRole: 'CEO ConnectSafely.org',
  },
  parentHubSection: {
    heading: 'PARENT HUB',
    description:
      'Learn more about what we’re doing to help your teen stay safe on our platform, explore our Family Center tool and download our Guardian’s Guide.',
    ctaButton: 'Learn More',
    link: '/safety-family-center',
  },
  teenCharterSection: {
    heading: 'TEEN CHARTER',
    description:
      'We work to center youth voices in our product design and policies. Together we built a charter with a set of principles for building a better place to play and chill.',
    ctaButton: 'Learn More',
    link: '/safety-teen-charter',
  },
};

export const WELLBEING_HUB_UK: WellbeingHubTranslation = {
  hero: {
    title: 'ХАБ БЛАГОПОЛУЧЧЯ ETERNAL',
    subtitle:
      'Відкрийте ресурси для захисту власного благополуччя або підтримки ментального здоров’я підлітків у мережі.',
  },
  resourcesSection: {
    title: 'РЕСУРСИ БЛАГОПОЛУЧЧЯ ТА ПІДТРИМКИ',
    subtitle:
      'Ми прагнемо допомогти користувачам розвивати навички та впевненість для комфортної та усвідомленої взаємодії в онлайн-просторі.',
    resources: [
      {
        id: 'players-guide',
        title: 'Посібник гравця Eternal',
        description:
          'Посібник гравця Eternal — це ваш головний помічник у тому, як безпечно спілкуватися, заводити знайомства та знаходити друзів.',
        actionType: 'button',
        actionLabel: 'Переглянути посібник',
        colorTheme: 'emerald',
      },
      {
        id: 'crisis-text-line',
        title: 'Кризова лінія Crisis Text Line',
        description:
          'Користувачі можуть зв’язатися з консультантом Crisis Text Line: це безкоштовна, цілодобова та конфіденційна текстова служба психологічної підтримки.',
        actionType: 'badge',
        badgeText: 'Надішліть ETERNAL на 741741',
        colorTheme: 'emerald',
        hasGemIllustration: true,
      },
      {
        id: 'throughline',
        title: 'ThroughLine',
        description:
          'Завдяки довіднику кризової підтримки у понад 100 країнах світу, користувачі можуть отримати безкоштовну допомогу телефоном, через чат або SMS.',
        actionType: 'button',
        actionLabel: 'Знайти підтримку в регіоні',
        colorTheme: 'emerald',
      },
      {
        id: 'research-paper',
        title: 'Сприяння благополуччю через онлайн-спільноти: Розуміння ментального здоров’я',
        description:
          'Комплексне дослідження позитивного впливу онлайн-дружби та ігрових спільнот на психоемоційний стан підлітків.',
        actionType: 'button',
        actionLabel: 'Читати дослідження',
        colorTheme: 'emerald',
      },
    ],
  },
  principlesSection: {
    title: 'ПРИНЦИПИ БЛАГОПОЛУЧЧЯ ТА ПІДТРИМКИ',
    subtitle:
      'Ми переконані, що цифровий простір має бути джерелом щирого спілкування та розвитку для кожного. Разом із Digital Wellness Lab при Бостонській дитячій лікарні ми сформували чотири принципи, якими керуємося у всій нашій роботі.',
    principles: [
      {
        id: 'gaming-connection',
        iconType: 'gaming',
        title: 'Ігри формують щирі зв’язки',
        description:
          'Ми визнаємо, що ігри та онлайн-спільноти розвивають життєві навички та дарують справжніх друзів. Віртуальна взаємодія підтримує емоційне благополуччя, а ми створюємо інструменти для щирого та безпечного спілкування.',
      },
      {
        id: 'agency-transparency',
        iconType: 'agency',
        title: 'Підтримка вибору користувача та прозорість',
        description:
          'Завдяки дослідженням та думкам підлітків ми створюємо правила та функції, що поважають свободу вибору. Ми відкрито пояснюємо наші рішення та допомагаємо батькам і дітям знаходити спільну мову.',
      },
      {
        id: 'safety-by-design',
        iconType: 'safety',
        title: 'Безпека за замовчуванням та проактивний захист',
        description:
          'Турбота про ментальне здоров’я закладена в архітектуру Eternal із першого дня. Ми розробляємо автоматичні фільтри від токсичності та делікатні нагадування про відпочинок.',
      },
      {
        id: 'empathy-spaces',
        iconType: 'empathy',
        title: 'Спільноти на основі емпатії',
        description:
          'Створення культури взаємодопомоги та поваги. Ми навчаємо модераторів інструментам деескалації конфліктів, щоб кожен відчував себе захищеним.',
      },
    ],
  },
  moreResourcesSection: {
    title: 'БІЛЬШЕ РЕСУРСІВ',
    readMoreLabel: 'Читати статтю',
    articles: [
      {
        id: 'ecpat-banter',
        category: 'Безпека',
        title: 'ECPAT x Eternal: Що робити, коли онлайн-жарти заходять занадто далеко',
        summary:
          'Практичні поради щодо розпізнавання межі між дружніми підколюваннями та образливим булінгом.',
        thumbnailType: 'banter',
      },
      {
        id: 'better-communities',
        category: 'Безпека',
        title: 'Кращі спільноти починаються з нас: Партнерство Eternal з молодіжними лідерами',
        summary:
          'Як підлітки допомагають розробляти інструменти проти кібербулінгу та створювати затишні сервери.',
        thumbnailType: 'communities',
      },
      {
        id: 'teen-road',
        category: 'Безпека',
        title: 'Благополуччя підлітків: Навчаємося та будуємо безпечний простір разом',
        summary:
          'Підсумки наших семінарів для молоді про здоровий баланс екранного часу та збереження щирої дружби.',
        thumbnailType: 'on-the-road',
      },
      {
        id: 'digital-boundaries',
        category: 'Ментальний комфорт',
        title: 'Цифрові кордони: Як зробити здорову паузу від голосових та текстових чатів',
        summary:
          'Покрокові інструкції щодо налаштування статусів, режиму відпочинку та подолання страху пропустити щось важливе (FOMO).',
        thumbnailType: 'boundaries',
      },
      {
        id: 'parent-guide-emotions',
        category: 'Сім’я та молодь',
        title: 'Посібник для батьків: Підтримка емоційної стійкості підлітків у мережі',
        summary:
          'Поради для щирих розмов у родині про виклики онлайн-життя, баланс ігор та цифровий добробут.',
        thumbnailType: 'parent-guide',
      },
      {
        id: 'mindfulness-gaming',
        category: 'Благополуччя',
        title: 'Усвідомленість у грі: Як спільні відеоігри допомагають долати стрес',
        summary:
          'Як кооперативні ігри та творчі сервери можуть стати чудовим способом психологічного розвантаження після навчання.',
        thumbnailType: 'mindfulness',
      },
    ],
  },
  globalSupportModal: {
    title: 'Міжнародний довідник психологічної та кризової допомоги',
    subtitle:
      'Якщо ви або ваші близькі переживаєте важкий період — безкоштовна, конфіденційна підтримка доступна цілодобово.',
    closeBtn: 'Закрити довідник',
    regions: [
      {
        region: 'Україна',
        services: [
          {
            name: 'Національна гаряча лінія для дітей та молоді',
            contact: '0 800 500 225 або 116 111 (безкоштовно)',
            desc: 'Психологічна та правова підтримка для дітей, підлітків та батьків.',
          },
          {
            name: 'Гаряча лінія запобігання самогубствам Lifeline Ukraine',
            contact: '7333 (цілодобово)',
            desc: 'Національна лінія психологічної підтримки та кризової допомоги.',
          },
        ],
      },
      {
        region: 'США та Канада',
        services: [
          {
            name: 'Crisis Text Line',
            contact: 'Надішліть ETERNAL на 741741',
            desc: 'Безкоштовна цілодобова підтримка у текстовому форматі.',
          },
          {
            name: 'Suicide & Crisis Lifeline',
            contact: 'Зателефонуйте або надішліть SMS на 988',
            desc: 'Цілодобова лінія екстреної психологічної допомоги.',
          },
        ],
      },
      {
        region: 'Велика Британія та Європа',
        services: [
          {
            name: 'Shout Crisis Text Line (UK)',
            contact: 'SMS зі словом SHOUT на 85258',
            desc: 'Цілодобова конфіденційна текстова допомога у Великій Британії.',
          },
          {
            name: 'Європейська лінія допомоги дітям',
            contact: '116 111 (у країнах ЄС)',
            desc: 'Безкоштовна лінія допомоги для підлітків та молоді у країнах ЄС.',
          },
        ],
      },
    ],
  },
  quoteSection: {
    quote:
      '«Сімейний центр надає батькам саме те, що потрібно для ненав’язливої підтримки підлітків у Eternal. Це схоже на реальний світ, де ви знаєте, з ким спілкується ваша дитина і чим займається, але не підслуховуєте її приватні розмови та не контролюєте кожен крок. Інструменти Сімейного центру допомагають розвивати корисні цифрові звички та критичне мислення, які знадобляться не лише в Eternal, а й у всьому житті.»',
    author: 'Ларрі Мегід',
    authorRole: 'Генеральний директор ConnectSafely.org',
  },
  parentHubSection: {
    heading: 'ХАБ ДЛЯ БАТЬКІВ',
    description:
      'Дізнайтеся більше про те, як ми захищаємо підлітків на платформі, користуйтеся інструментами Сімейного центру та завантажуйте посібник для батьків від Eternal.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-family-center',
  },
  teenCharterSection: {
    heading: 'ХАРТІЯ ПІДЛІТКІВ',
    description:
      'Ми прислухаємося до думок молоді під час розробки функцій та правил. Разом із підлітками з усього світу ми створили хартію, яка робить Eternal затишним простором для кожного.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-teen-charter',
  },
};
