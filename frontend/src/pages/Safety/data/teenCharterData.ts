export interface TeenCharterPillar {
  id: string;
  badge: string;
  title: string;
  description: string;
  colorTheme: 'purple' | 'indigo' | 'rose' | 'amber';
}

export interface QuizScenario {
  id: string;
  question: string;
  channelName?: string;
  messages?: Array<{
    author: string;
    avatarBg: string;
    text: string;
    isMedia?: boolean;
    mediaCaption?: string;
  }>;
  profileData?: {
    username: string;
    tagline: string;
    mutuals: string;
  };
  correctAnswer: 'acceptable' | 'unacceptable';
  explanation: {
    correctTitle: string;
    incorrectTitle: string;
    reason: string;
  };
}

export interface PartnerSlide {
  id: string;
  partnerKey: 'boston' | 'thorn' | 'thinkyoung';
  name: string;
  subname?: string;
  description: string;
  highlightText?: string;
  linkText?: string;
  linkUrl?: string;
}

export interface TeenCharterTranslation {
  hero: {
    title: string;
    subtitle: string;
  };
  introSection: {
    heading: string;
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
  };
  charterSection: {
    title: string;
    subtitle: string;
    pillars: TeenCharterPillar[];
  };
  villageSection: {
    title: string;
    description: string;
    point1: {
      title: string;
      text: string;
    };
    point2: {
      title: string;
      text: string;
      linkText: string;
    };
  };
  quizSection: {
    title: string;
    subtitle: string;
    acceptableBtn: string;
    unacceptableBtn: string;
    resetQuizBtn: string;
    scenarios: QuizScenario[];
  };
  partnersSection: {
    slides: PartnerSlide[];
  };
}

export const TEEN_CHARTER_EN: TeenCharterTranslation = {
  hero: {
    title: 'A CHARTER FOR A BETTER PLACE TO PLAY & CHILL TOGETHER',
    subtitle: 'Created with teens, for teens.',
  },
  introSection: {
    heading: 'THIS MAY COME AS A SURPRISE,',
    paragraph1: 'but the person writing these words is not a teen.',
    paragraph2:
      "So while we're not experts in what it feels like to be a teen right now, we are experts in building digital spaces where you and your friends can play and chill.",
    paragraph3:
      "And because you're great at knowing what it's like to be you, a teen, we have worked closely with teen users globally (30+ focus groups!) to understand what matters most to make your experiences safe.",
  },
  charterSection: {
    title: 'TEEN CHARTER',
    subtitle:
      "This set of principles represent the expectations teens have of each other and of Eternal. Whether you're new to Eternal or a long time user, this charter is key to keep in mind and hold each other and us accountable to - so everyone can have a safe experience. These principles will help inform product and policy improvements that make Eternal a better place to play and chill.",
    pillars: [
      {
        id: 'authenticity',
        badge: 'COME AS YOU ARE',
        title: 'AUTHENTICITY',
        description:
          'Be yourself and express your genuine interests. No need to pretend to be someone you’re not. Celebrate what makes you unique and find communities that share your true passions.',
        colorTheme: 'purple',
      },
      {
        id: 'privacy',
        badge: "WHAT'S YOURS IS YOURS",
        title: 'PRIVACY',
        description:
          'Control what you share and who gets to see it. We protect your private direct messages, voice calls, and account security by default with advanced end-to-end safeguards.',
        colorTheme: 'indigo',
      },
      {
        id: 'respect',
        badge: 'TREAT PEOPLE RIGHT',
        title: 'RESPECT & INCLUSIVITY',
        description:
          'Kindness and fairness matter. Stand against bullying, targeted harassment, and toxic exclusion. Great communities are built on empathy, patience, and mutual respect.',
        colorTheme: 'rose',
      },
      {
        id: 'agency',
        badge: 'YOU HAVE THE POWER',
        title: 'AGENCY & CONTROL',
        description:
          'Easy-to-use safety tools to mute, block, report, and filter content that doesn’t vibe with you. You hold the controls over your notifications, friends list, and direct messages.',
        colorTheme: 'amber',
      },
    ],
  },
  villageSection: {
    title: 'IT TAKES A VILLAGE',
    description:
      'We agree with teens that it’s first and foremost our responsibility to create positive experiences on Eternal, which is why we provide tools that build in checkpoints like our Teen Safety Assist initiative.',
    point1: {
      title: 'Moderator & Admin Leadership',
      text: 'Server moderators and administrators also have a unique vantage point and use tools to help maintain a healthy environment. When you don’t have to think about protecting yourself, then we’re doing our job.',
    },
    point2: {
      title: 'Proactive Safety Tools',
      text: 'We heard from teens that some of you have developed skills to make an assessment and take action to keep yourself safe. Know that you don’t have to do it alone — we have your back and work endlessly to keep you safe while protecting your privacy.',
      linkText: 'while protecting your privacy',
    },
  },
  quizSection: {
    title: 'RECOGNIZING POOR FORM',
    subtitle:
      'See if you can guess which examples are acceptable and in line with our Community Guidelines, Terms of Service, or other policies. Click the thumbs up if you think the example is acceptable or thumbs down if you think the example is unacceptable.',
    acceptableBtn: 'Acceptable',
    unacceptableBtn: 'Unacceptable',
    resetQuizBtn: 'Try Again',
    scenarios: [
      {
        id: 'quiz-harper',
        question: "Do you think Harper's message in this GDM is acceptable conduct?",
        channelName: 'Story time group',
        messages: [
          {
            author: 'EatingKatsu',
            avatarBg: '#818cf8',
            text: "guess we'll never kno wut happened",
          },
          {
            author: 'Harper',
            avatarBg: '#f43f5e',
            text: 'Wuhhh dude, are you trying to sound stupid or are you just actually...',
          },
        ],
        correctAnswer: 'unacceptable',
        explanation: {
          correctTitle: 'Correct! That is unacceptable conduct.',
          incorrectTitle: 'Not quite! This is unacceptable.',
          reason:
            'Mocking, insulting, or belittling friends or group members crosses the line into toxic harassment. Respectful disagreement is fine, but personal degradation violates Community Guidelines.',
        },
      },
      {
        id: 'quiz-jesu',
        question: "Do you think Jesu's message is acceptable conduct?",
        channelName: 'Gaming Lounge',
        messages: [
          {
            author: 'Shawn',
            avatarBg: '#34d399',
            text: 'this game is so good ill join in a bit. wait for meeeee~',
            isMedia: true,
            mediaCaption: 'Gameplay Highlights Clip (0:45)',
          },
        ],
        correctAnswer: 'acceptable',
        explanation: {
          correctTitle: 'Correct! This is totally acceptable!',
          incorrectTitle: 'Actually, this is acceptable!',
          reason:
            'Sharing fun gameplay video clips and coordinating play sessions with friends is the heart of Eternal. Positive gaming banter is encouraged!',
        },
      },
      {
        id: 'quiz-stranger',
        question: 'Do you think this friend request is acceptable conduct?',
        profileData: {
          username: 'Fr1end2345~~!',
          tagline: 'Hey send me your location & insta fast!!',
          mutuals: '0 mutual friends • 0 mutual servers',
        },
        correctAnswer: 'unacceptable',
        explanation: {
          correctTitle: 'Correct! That is unacceptable and suspicious.',
          incorrectTitle: 'Be careful! This is unacceptable.',
          reason:
            'Random unsolicited friend requests from strangers demanding personal contact information or location data pose safety risks. Decline and use Teen Safety Assist to block them.',
        },
      },
    ],
  },
  partnersSection: {
    slides: [
      {
        id: 'boston-childrens',
        partnerKey: 'boston',
        name: "Boston Children's",
        subname: 'Digital Wellness Lab',
        description:
          "The Digital Wellness Lab at Boston Children's Hospital is a nonprofit research institution seeking to understand and promote positive and healthy digital media experiences for young people, from birth through young adulthood. Their vision is an empathetic and respectful world in which our kids can grow up healthy, smart, and kind.",
        linkText: 'Digital Wellness Lab',
        linkUrl: 'https://digitalwellnesslab.org',
      },
      {
        id: 'thorn-nofiltr',
        partnerKey: 'thorn',
        name: 'NŌFILTR',
        subname: 'THORN',
        description:
          'NoFiltr is a leading digital safety initiative, powered by Thorn – a nonprofit organization that builds technology to defend children from sexual abuse. NoFiltr aims to empower youth with knowledge and resources to safely navigate the complex dynamic of online spaces and shares real experiences and advice, for youth, with the help of youth perspectives. For more information, visit nofiltr.org.',
        linkText: 'nofiltr.org',
        linkUrl: 'https://nofiltr.org',
      },
      {
        id: 'think-young',
        partnerKey: 'thinkyoung',
        name: 'ThinkYoung',
        description:
          'ThinkYoung is a not-for-profit organization, aiming to make the world a better place for young people by involving them in decision-making processes and providing decision-makers with high-quality research on youth conditions. ThinkYoung conducts studies and surveys, makes advocacy campaigns, writes policy proposals, and develops education programmes: up to date, ThinkYoung projects have reached over 800,000 young people.',
        linkText: 'ThinkYoung',
        linkUrl: 'https://www.thinkyoung.eu',
      },
    ],
  },
};

export const TEEN_CHARTER_UK: TeenCharterTranslation = {
  hero: {
    title: 'ХАРТІЯ ДЛЯ КРАЩОГО ПРОСТОРУ, ЩОБ ГРАТИ ТА ВІДПОЧИВАТИ РАЗОМ',
    subtitle: 'Створено разом із підлітками для підлітків.',
  },
  introSection: {
    heading: 'ЦЕ МОЖЕ СТАТИ НЕСПОДІВАНКОЮ,',
    paragraph1: 'але автор цих слів уже не є підлітком.',
    paragraph2:
      'Тому, хоча ми й не можемо знати достеменно, як це — бути підлітком прямо зараз, ми є експертами у створенні цифрових просторів, де ви та ваші друзі можете грати та відпочивати.',
    paragraph3:
      'І оскільки ви найкраще знаєте, що потрібно саме вам, ми тісно співпрацювали з підлітками по всьому світу (понад 30 фокус-груп!), щоб зрозуміти, що найважливіше для вашої безпеки.',
  },
  charterSection: {
    title: 'ХАРТІЯ ПІДЛІТКІВ',
    subtitle:
      'Цей набір принципів відображає очікування, які підлітки мають один до одного та до платформи Eternal. Незалежно від того, новачок ви чи постійний користувач, пам’ятайте про ці правила, щоб кожен відчував себе захищеним. Ці принципи формують розвиток наших функцій та політик.',
    pillars: [
      {
        id: 'authenticity',
        badge: 'БУДЬ СОБОЮ',
        title: 'АВТЕНТИЧНІСТЬ',
        description:
          'Будьте собою та відкрито висловлюйте справжні інтереси. Не потрібно вдавати з себе когось іншого. Знаходьте спільноти, які щиро поділяють ваші захоплення.',
        colorTheme: 'purple',
      },
      {
        id: 'privacy',
        badge: 'ТВОЄ — ЦЕ ТВОЄ',
        title: 'ПРИВАТНІСТЬ',
        description:
          'Контролюйте, чим ви ділитеся та хто може це бачити. Ми за замовчуванням захищаємо ваші особисті повідомлення, дзвінки та конфіденційні дані.',
        colorTheme: 'indigo',
      },
      {
        id: 'respect',
        badge: 'ПОВАЖАЙ ІНШИХ',
        title: 'ПОВАГА ТА ІНКЛЮЗИВНІСТЬ',
        description:
          'Доброта та справедливість мають значення. Виступайте проти булінгу, цілеспрямованого цькування та токсичності. Чудові спільноти тримаються на взаємоповазі.',
        colorTheme: 'rose',
      },
      {
        id: 'agency',
        badge: 'СИЛА В ТВОЇХ РУКАХ',
        title: 'КОНТРОЛЬ ТА ВИБІР',
        description:
          'Зручні інструменти безпеки для заглушення, блокування, скарг та фільтрації контенту. Ви маєте повний контроль над власним цифровим простором.',
        colorTheme: 'amber',
      },
    ],
  },
  villageSection: {
    title: 'СПІЛЬНА ВІДПОВІДАЛЬНІСТЬ',
    description:
      'Ми погоджуємося з підлітками в тому, що забезпечення безпеки на Eternal — це насамперед наш обов’язок. Саме тому ми впроваджуємо такі ініціативи, як Teen Safety Assist.',
    point1: {
      title: 'Роль модераторів та адміністраторів',
      text: 'Модератори та адміністратори серверів використовують передові інструменти для підтримки здорової атмосфери. Коли вам не потрібно турбуватися про захист — ми добре робимо свою роботу.',
    },
    point2: {
      title: 'Проактивні інструменти захисту',
      text: 'Багато підлітків уже вміють оцінювати ризики та вживати заходів для самозахисту. Знайте: вам не обов’язково робити це наодинці — ми завжди поруч, щоб захистити вас і вашу приватність.',
      linkText: 'захистити вас і вашу приватність',
    },
  },
  quizSection: {
    title: 'РОЗПІЗНАВАННЯ НЕПРИПУСТИМОЇ ПОВЕДІНКИ',
    subtitle:
      'Перевірте, чи зможете ви розпізнати прийнятну поведінку згідно з нашими Правилами спільноти. Тисніть «Палець вгору», якщо приклад прийнятний, або «Палець вниз», якщо ні.',
    acceptableBtn: 'Прийнятно',
    unacceptableBtn: 'Неприйнятно',
    resetQuizBtn: 'Спробувати знову',
    scenarios: [
      {
        id: 'quiz-harper',
        question: 'Чи вважаєте ви повідомлення Harper у груповому чаті прийнятним?',
        channelName: 'Story time group',
        messages: [
          {
            author: 'EatingKatsu',
            avatarBg: '#818cf8',
            text: 'мабуть, ми ніколи не дізнаємося, що сталося',
          },
          {
            author: 'Harper',
            avatarBg: '#f43f5e',
            text: 'Чувак, ти навмисно прикидаєшся дурним чи реально такий...',
          },
        ],
        correctAnswer: 'unacceptable',
        explanation: {
          correctTitle: 'Правильно! Це неприйнятна поведінка.',
          incorrectTitle: 'Ні, це вважається неприйнятним.',
          reason:
            'Глузування та приниження учасників навіть у приватному груповому чаті є токсичним булінгом і порушує Правила спільноти Eternal.',
        },
      },
      {
        id: 'quiz-jesu',
        question: 'Чи вважаєте ви повідомлення Jesu прийнятною поведінкою?',
        channelName: 'Gaming Lounge',
        messages: [
          {
            author: 'Shawn',
            avatarBg: '#34d399',
            text: 'гра просто топчик, скоро приєднаюся. зачекайте на мене-е-е~',
            isMedia: true,
            mediaCaption: 'Відеофрагмент геймплею (0:45)',
          },
        ],
        correctAnswer: 'acceptable',
        explanation: {
          correctTitle: 'Правильно! Це цілком прийнятно!',
          incorrectTitle: 'Насправді це абсолютно прийнятно!',
          reason:
            'Ділитися яскравими відеофрагментами ігор та збиратися разом для спільної гри — це саме те, заради чого створено Eternal!',
        },
      },
      {
        id: 'quiz-stranger',
        question: 'Чи вважаєте ви такий запит у друзі прийнятним?',
        profileData: {
          username: 'Fr1end2345~~!',
          tagline: 'Гей, скинь мені свою геолокацію та інсту скоріше!!',
          mutuals: '0 спільних друзів • 0 спільних серверів',
        },
        correctAnswer: 'unacceptable',
        explanation: {
          correctTitle: 'Правильно! Це підозрілий і неприйнятний запит.',
          incorrectTitle: 'Обережно! Це підозріло.',
          reason:
            'Несподівані запити від незнайомців із вимогою особистих даних або контактів становлять ризик. Відхиляйте їх та блокуйте за допомогою Teen Safety Assist.',
        },
      },
    ],
  },
  partnersSection: {
    slides: [
      {
        id: 'boston-childrens',
        partnerKey: 'boston',
        name: "Boston Children's",
        subname: 'Digital Wellness Lab',
        description:
          'Digital Wellness Lab при Бостонській дитячій лікарні — це некомерційна дослідницька установа, покликана вивчати та сприяти позитивному і здоровому досвіду взаємодії молоді з цифровими медіа від народження до юності. Їхнє бачення — це світ емпатії та поваги, у якому діти ростуть здоровими, розумними та добрими.',
        linkText: 'Digital Wellness Lab',
        linkUrl: 'https://digitalwellnesslab.org',
      },
      {
        id: 'thorn-nofiltr',
        partnerKey: 'thorn',
        name: 'NŌFILTR',
        subname: 'THORN',
        description:
          'NoFiltr — це провідна ініціатива цифрової безпеки від організації Thorn, яка розробляє технології для захисту дітей від сексуального насильства. NoFiltr прагне надати молоді знання та ресурси для безпечної навігації в онлайн-просторі, ділячись реальним досвідом та порадами з урахуванням поглядів самих підлітків. Для отримання додаткової інформації відвідайте nofiltr.org.',
        linkText: 'nofiltr.org',
        linkUrl: 'https://nofiltr.org',
      },
      {
        id: 'think-young',
        partnerKey: 'thinkyoung',
        name: 'ThinkYoung',
        description:
          'ThinkYoung — це неприбуткова організація, мета якої — зробити світ кращим для молоді шляхом залучення її до процесів прийняття рішень та надання лідерам якісних досліджень про життя молодого покоління. ThinkYoung проводить опитування, організовує адвокаційні кампанії, розробляє освітні програми: на сьогодні проєкти ThinkYoung охопили понад 800 000 молодих людей.',
        linkText: 'ThinkYoung',
        linkUrl: 'https://www.thinkyoung.eu',
      },
    ],
  },
};
