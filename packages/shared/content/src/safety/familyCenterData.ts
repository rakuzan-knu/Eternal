export interface FamilyCenterFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FamilyCenterTranslation {
  hero: {
    title: string;
    subtitle: string;
    ctaButton: string;
  };
  parentsSection: {
    heading: string;
    p1: string;
    p2: string;
    p3: string;
    ctaButton: string;
  };
  quoteCard: {
    quote: string;
    author: string;
    role: string;
    organization: string;
  };
  teensSection: {
    heading: string;
    p1: string;
    p2: string;
    ctaButton: string;
  };
  safetyApproach: {
    heading: string;
    card1: {
      title: string;
      description: string;
    };
    card2: {
      title: string;
      description: string;
    };
  };
  faq: {
    heading: string;
    parentsTab: string;
    teensTab: string;
    parentsFaqs: FamilyCenterFaqItem[];
    teensFaqs: FamilyCenterFaqItem[];
  };
  helpSection: {
    heading: string;
    description: string;
    ctaButton: string;
  };
}

export const FAMILY_CENTER_EN: FamilyCenterTranslation = {
  hero: {
    title: 'ETERNAL FAMILY CENTER',
    subtitle:
      'Learn more about what we’re doing to help your teen stay safer on our platform, explore our Family Center tool, and download our Parent’s Guide to Eternal.',
    ctaButton: 'Open Family Center',
  },
  parentsSection: {
    heading: 'FOR PARENTS AND GUARDIANS',
    p1: 'Eternal is the communications platform that enables you to build meaningful connections around the joy of playing games through voice, video and text features.',
    p2: 'Family Center is designed to help you learn more about how your teen spends their time on Eternal and allows you to play an active role in their experience on Eternal.',
    p3: 'Family Center shares limited activity totals and selected privacy controls after the teen confirms a connection. Weekly email summaries are not available. Pairing does not independently verify a legal guardian.',
    ctaButton: 'Open Family Center',
  },
  quoteCard: {
    quote:
      '“Family Center provides parents with what they need to help guide their teen’s use of Eternal without being too invasive. It’s like the physical world where you know who your kids are hanging out with and where they’re going but not listening in on their conversations or micromanaging their relationships. Tools like Family Center can help parents help their teens develop the habits and critical thinking skills that apply not only to Eternal but all of life.”',
    author: 'Larry Magid',
    role: 'CEO ConnectSafely.org',
    organization: 'ConnectSafely',
  },
  teensSection: {
    heading: 'FOR TEENS',
    p1: 'We built Family Center to help you help your parents or guardians easily stay informed and support your safety while also maintaining your privacy and autonomy on Eternal.',
    p2: 'Similar to how your parents might ask about the clubs you’re a part of or who your friends are at school, we make it easy for you to share the same information about your Eternal experience so your guardian can work with you to set boundaries. Family Center helps them manage certain safety and privacy settings on your account.',
    ctaButton: 'Open Family Center',
  },
  safetyApproach: {
    heading: 'ETERNAL’S APPROACH TO SAFETY',
    card1: {
      title: 'Community Guidelines',
      description:
        'Our Community Guidelines are designed to ensure everyone can find belonging on Eternal. We enforce them through a mix of proactive and reactive measures.',
    },
    card2: {
      title: 'Safety Controls',
      description:
        'Every user is provided with the tools to report content, block users, and limit who can send them friend requests.',
    },
  },
  faq: {
    heading: 'FREQUENTLY ASKED QUESTIONS',
    parentsTab: 'For Parents and Guardians',
    teensTab: 'For Teens',
    parentsFaqs: [
      {
        id: 'faq-parents-1',
        question: 'How do I set up Family Center with my teen?',
        answer:
          'The teen generates a connection code in User Settings → Family Center. An adult enters that code in their account. The teen must then approve the request; a code alone does not activate a connection.',
      },
      {
        id: 'faq-parents-2',
        question: 'What information will I be able to see as a parent?',
        answer:
          'A connected adult can see seven-day totals for new mutual friends, messaging contacts, call minutes and submitted reports. Family Center does not show contact lists, message contents, private photos or call audio.',
      },
      {
        id: 'faq-parents-3',
        question: 'Can I read my teen’s private messages or listen to voice calls?',
        answer:
          'No. Family Center is intentionally designed to balance safety with privacy. Message contents and voice audio remain completely private to protect your teen’s autonomy and trust.',
      },
      {
        id: 'faq-parents-4',
        question: 'How often are weekly email summaries sent?',
        answer:
          'Weekly email summaries are not available. View the seven-day totals inside Family Center. Email delivery and an operator response must not be assumed from a saved preference.',
      },
    ],
    teensFaqs: [
      {
        id: 'faq-teens-1',
        question: 'Can my parent read my private DMs or listen in on calls?',
        answer:
          'Never. Family Center never gives parents access to your message text, photos sent in private chats, or live voice channel conversations. Your chats remain private.',
      },
      {
        id: 'faq-teens-2',
        question: 'Can I disconnect Family Center at any time?',
        answer:
          'Yes. Either member can disconnect in User Settings → Family Center, including during downtime. A connected session may receive an in-app update; no notification email is sent.',
      },
      {
        id: 'faq-teens-3',
        question: 'What happens when I turn 18?',
        answer:
          'When you reach the age of majority (18), Family Center links are automatically retired and disconnected, giving you standard independent adult account status.',
      },
    ],
  },
  helpSection: {
    heading: "WE'RE HERE TO HELP!",
    description:
      'From Account Settings to Advanced Permissions, get support for everything Eternal at our Safety Center.',
    ctaButton: 'Visit Eternal Safety Center',
  },
};

export const FAMILY_CENTER_UK: FamilyCenterTranslation = {
  hero: {
    title: 'СІМЕЙНИЙ ЦЕНТР ETERNAL',
    subtitle:
      'Дізнайтеся більше про те, як ми допомагаємо вашим підліткам безпечно спілкуватися на платформі, користуйтеся інструментами Сімейного центру та завантажуйте посібник для батьків.',
    ctaButton: 'Відкрити Сімейний центр',
  },
  parentsSection: {
    heading: 'ДЛЯ БАТЬКІВ ТА ОПІКУНІВ',
    p1: 'Eternal — це комунікаційна платформа, яка допомагає будувати щире спілкування навколо спільних інтересів та ігор за допомогою голосу, відео та тексту.',
    p2: 'Сімейний центр створений, щоб допомогти вам краще розуміти, як підліток проводить час в Eternal, та брати активну участь у формуванні безпечного середовища.',
    p3: 'Після підтвердження зв’язку підлітком Сімейний центр показує обмежені підсумки активності та окремі налаштування приватності. Щотижневі email-звіти недоступні. Зв’язок не є незалежною перевіркою повноважень законного представника.',
    ctaButton: 'Відкрити Сімейний центр',
  },
  quoteCard: {
    quote:
      '“Сімейний центр надає батькам саме те, що потрібно для підтримки підлітків без надмірного втручання в особистий простір. Це схоже на реальне життя: ви знаєте, з ким спілкуються ваші діти та куди ходять, але не підслуховуєте кожне слово й не контролюєте кожен крок.”',
    author: 'Ларрі Мегід',
    role: 'Керівник ConnectSafely.org',
    organization: 'ConnectSafely',
  },
  teensSection: {
    heading: 'ДЛЯ ПІДЛІТКІВ',
    p1: 'Ми створили Сімейний центр, щоб допомогти батькам залишатися в курсі вашої безпеки, водночас зберігаючи вашу повну автономію та приватність в Eternal.',
    p2: 'Подібно до того, як батьки запитують про шкільні гуртки чи друзів, Сімейний центр дозволяє легко ділитися загальною інформацією про активність, допомагаючи встановлювати здорові цифрові межі.',
    ctaButton: 'Відкрити Сімейний центр',
  },
  safetyApproach: {
    heading: 'ПІДХІД ETERNAL ДО БЕЗПЕКИ',
    card1: {
      title: 'Правила спільноти',
      description:
        'Наші Правила спільноти створені для того, щоб кожен почувався затишно в Eternal. Ми стежимо за їх виконанням проактивно та на основі звернень.',
    },
    card2: {
      title: 'Інструменти контролю безпеки',
      description:
        'Кожен користувач має возможность блокувати небажаних співрозмовників, надсилати скарги та обмежувати вхідні запити в друзі.',
    },
  },
  faq: {
    heading: 'ЧАСТІ ЗАПИТАННЯ',
    parentsTab: 'Для батьків та опікунів',
    teensTab: 'Для підлітків',
    parentsFaqs: [
      {
        id: 'faq-parents-1',
        question: 'Як налаштувати Сімейний центр разом із підлітком?',
        answer:
          'Підліток створює код у Налаштуваннях → Сімейний центр. Дорослий вводить його у своєму акаунті, після чого підліток підтверджує запит. Самого коду недостатньо для активації зв’язку.',
      },
      {
        id: 'faq-parents-2',
        question: 'Яку інформацію бачать батьки?',
        answer:
          'Пов’язаний дорослий бачить підсумки за сім днів: кількість нових взаємних контактів, співрозмовників, хвилин дзвінків і поданих скарг. Списки контактів, текст повідомлень, приватні фото й аудіо дзвінків Сімейний центр не показує.',
      },
      {
        id: 'faq-parents-3',
        question: 'Чи можуть батьки читати листування або слухати дзвінки?',
        answer:
          'Ні. Сімейний центр зберігає приватність підлітка: зміст текстових чатів та аудіо дзвінків ніколи не передається батькам.',
      },
      {
        id: 'faq-parents-4',
        question: 'Як часто надсилаються щотижневі звіти?',
        answer:
          'Щотижневі email-звіти недоступні. Підсумки за сім днів можна переглянути в Сімейному центрі. Збережена опція не підтверджує доставку листа чи відповідь оператора.',
      },
    ],
    teensFaqs: [
      {
        id: 'faq-teens-1',
        question: 'Чи можуть батьки читати мої приватні повідомлення?',
        answer:
          'Ніколи. Батьки не мають доступу до тексту повідомлень, фотографій у чатах або аудіо в голосових кімнатах.',
      },
      {
        id: 'faq-teens-2',
        question: 'Чи можу я відключити Сімейний центр у будь-який момент?',
        answer:
          'Так. Будь-який учасник може розірвати зв’язок у Налаштуваннях, зокрема під час обмеження доступу. Відкрита сесія іншого учасника може отримати оновлення в застосунку; email не надсилається.',
      },
      {
        id: 'faq-teens-3',
        question: 'Що відбувається після досягнення 18 років?',
        answer:
          'Після досягнення повноліття (18 років) зв’язок Сімейного центру автоматично відключається, а обліковий запис переходить у стандартний дорослий режим.',
      },
    ],
  },
  helpSection: {
    heading: 'МИ ТУТ, ЩОБ ДОПОМОГТИ!',
    description:
      'Від налаштувань облікового запису до розширених прав доступу — отримайте підтримку з усіх питань Eternal у нашому Центрі безпеки.',
    ctaButton: 'Відвідати Центр безпеки Eternal',
  },
};

export const FAMILY_CENTER_TRANSLATIONS: Record<string, FamilyCenterTranslation> = {
  English: FAMILY_CENTER_EN,
  Українська: FAMILY_CENTER_UK,
  Deutsch: FAMILY_CENTER_EN,
  Español: FAMILY_CENTER_EN,
  Français: FAMILY_CENTER_EN,
};
