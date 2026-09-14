import { SupportedLanguage } from '../../../shared/lib/language/languageStore';
import { TERMS_SECTIONS, TermsSection } from './termsContent';
import { getLegalTranslation as getPrivacyTranslation } from '../../Privacy/data/privacyTranslations';

export interface TermsUITranslation {
  navbar: {
    product: string;
    safety: string;
    support: string;
    blog: string;
    developers: string;
    careers: string;
    openEternal: string;
    infoTitle: string;
    centersTitle: string;
    resourcesTitle: string;
    collectionsTitle: string;
    learnTitle: string;
    buildTitle: string;
    familyCenter: string;
    safetyLibrary: string;
    securityBulletins: string;
    teenSafety: string;
    voiceRoomGuidelines: string;
    parentHub: string;
    policyEnforcement: string;
    privacyPolicyActive: string;
    transparencyReports: string;
    helpCenter: string;
    feedback: string;
    submitRequest: string;
    featured: string;
    community: string;
    eternalHq: string;
    engineering: string;
    howToEternal: string;
    policySafety: string;
    productFeatures: string;
    eternalForDevs: string;
    integration: string;
    socialCommerce: string;
    appsActivities: string;
    devNewsletter: string;
    devCaseStudies: string;
    officialCommunities: string;
    devPortal: string;
    documentation: string;
    devHelpCenter: string;
  };
  hero: {
    title: string;
    effectiveDate: string;
    description: string;
  };
  toc: {
    contents: string;
    readProgress: string;
    print: string;
    backToTop: string;
  };
  callout: {
    briefly: string;
  };
  sections: TermsSection[];
}

// 1. English (Default)
const EN_TERMS: TermsUITranslation = {
  navbar: getPrivacyTranslation('English').navbar,
  hero: {
    title: "ETERNAL'S TERMS OF SERVICE",
    effectiveDate: 'Effective Date: September 1, 2026 • Last Updated: August 28, 2026',
    description:
      'These Terms of Service set forth our mutual legal agreement when you use Eternal’s visual feeds, instant chats, voice rooms, and music streaming. We made them clear, transparent, and user-first.',
  },
  toc: {
    contents: 'Contents',
    readProgress: '% read',
    print: 'Print',
    backToTop: 'Back to Top',
  },
  callout: {
    briefly: 'Briefly about this',
  },
  sections: TERMS_SECTIONS,
};

// 2. Ukrainian (Українська)
const UK_TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'who-we-are',
    number: '1',
    title: 'Ласкаво просимо в Eternal та хто ми є',
    iconName: 'ShieldCheck',
    tldr: 'Ласкаво просимо в Eternal! Ці Умови використання регулюють наші взаємні права та обов’язки при використанні веб-сайту, мобільних та десктопних додатків.',
    subsections: [
      {
        id: 'welcome-and-mission',
        title: '1.1 Ласкаво просимо в Eternal',
        content: [
          'Eternal - це сучасна соціальна мережа, створена для об’єднання людей. Вона поєднує стрічку публікацій із фото та історіями, месенджер зі зникаючими повідомленнями, голосові та відеокімнати в реальному часі та спільне прослуховування музики.',
          'Ці Умови використання («Умови») регулюють ваш доступ до сервісів Eternal. Створюючи акаунт або користуючись додатком, ви погоджуєтеся дотримуватися цих Умов, нашої Політики конфіденційності та Правил спільноти.',
        ],
        bullets: [
          'Користуючись Eternal, ви погоджуєтеся ставитися до інших із повагою.',
          'Ми надаємо зручні налаштування конфіденційності для вашого комфорту.',
          'Якщо ви не згодні з цими Умовами, ви не можете використовувати наші сервіси.',
        ],
      },
      {
        id: 'company-details',
        title: '1.2 Хто керує Eternal',
        content: [
          'Під назвою «Eternal», «ми», «нас» або «наш» мається на увазі компанія Eternal Inc. (Сан-Франциско, Каліфорнія, США) та її міжнародні філії.',
        ],
      },
    ],
  },
  {
    id: 'age-requirements',
    number: '2',
    title: 'Вікові обмеження та відповідальність батьків',
    iconName: 'Database',
    tldr: 'Вам має бути не менше 13 років (або 16+ у ЄС) для використання Eternal. Батьки та опікуни несуть відповідальність за акаунти неповнолітніх.',
    subsections: [
      {
        id: 'minimum-age',
        title: '2.1 Мінімальний вік користувачів',
        content: [
          'Отримуючи доступ до сервісу, ви підтверджуєте, що вам виповнилося 13 років і ви досягли встановленого законом віку цифрової згоди у вашій країні (наприклад, 16 років у деяких країнах ЄС).',
          'Наші послуги не призначені для дітей віком до 13 років. Якщо ми виявимо акаунт дитини молодшого віку, він буде негайно заблокований, а дані видалені.',
        ],
      },
      {
        id: 'parents-and-guardians',
        title: '2.2 Відповідальність батьків та опікунів',
        content: [
          'Якщо ви є батьком або опікуном і дозволяєте неповнолітньому користуватися Eternal, ви погоджуєтеся з цими Умовами та несете відповідальність за його активність та покупки.',
        ],
      },
    ],
  },
  {
    id: 'what-you-can-expect',
    number: '3',
    title: 'Чого ви можете очікувати від нас',
    iconName: 'Cpu',
    tldr: 'Ми надаємо візуальну стрічку, чати, голосові кімнати та музику. Ми постійно розвиваємо функціонал і підтримуємо безпеку платформи.',
    subsections: [
      {
        id: 'service-features',
        title: '3.1 Можливості платформи Eternal',
        content: ['Eternal надає універсальний соціальний простір:'],
        bullets: [
          'Візуальна стрічка: Фотографії, історії, рілси, підписи та інтерактивні коментарі.',
          'Месенджер: Особисті та групові чати в реальному часі, зникаючі повідомлення.',
          'Голосові та відеокімнати: Зв’язок із низькою затримкою, демонстрація екрана та відсутність запису розмов.',
          'Музичні інтеграції: Підключення Spotify або SoundCloud із показом статусу та спільним прослуховуванням.',
        ],
      },
      {
        id: 'service-evolution',
        title: '3.2 Розвиток та оновлення платформи',
        content: [
          'Ми регулярно розробляємо нові функції. Ми прагнемо забезпечити стабільну роботу, однак не можемо гарантувати 100% безперебійність сервісу.',
        ],
      },
    ],
  },
  {
    id: 'your-account',
    number: '4',
    title: 'Ваш обліковий запис Eternal та безпека',
    iconName: 'KeyRound',
    tldr: 'Ви відповідаєте за безпеку свого облікового запису. Заборонено передавати або продавати свій акаунт третім особам.',
    subsections: [
      {
        id: 'account-creation',
        title: '4.1 Створення та захист профілю',
        content: [
          'Для користування Eternal ви створюєте профіль із надійним паролем. Ви зобов’язуєтеся надавати актуальну інформацію.',
          'Ви відповідаєте за всі дії у своєму акаунті. Рекомендуємо увімкнути двофакторну автентифікацію (2FA). У разі підозри на злам негайно напишіть нам на security@eternal.app.',
        ],
      },
      {
        id: 'account-transfer',
        title: '4.2 Заборона продажу акаунтів',
        content: [
          'Заборонено продавати, здавати в оренду або передавати свій акаунт або ім’я користувача іншим особам.',
        ],
      },
    ],
  },
  {
    id: 'content-and-conduct',
    number: '5',
    title: 'Контент в Eternal та правила поведінки',
    iconName: 'Eye',
    tldr: 'Ви володієте своїм контентом. Ви надаєте нам ліцензію лише для його доставки вашим підписникам. Спам, булінг та нелегальний контент суворо заборонені.',
    subsections: [
      {
        id: 'your-content-license',
        title: '5.1 Права на ваш контент',
        content: [
          'Ви зберігаєте повні авторські права на всі фото, відео, історії та повідомлення, які ви публікуєте в Eternal.',
          'Публікуючи матеріали, ви надаєте Eternal невиключну безоплатну ліцензію на відображення та доставку контенту вашій аудиторії (публічно або схваленим підписникам).',
        ],
      },
      {
        id: 'community-rules',
        title: '5.2 Заборонені дії',
        content: ['В Eternal суворо заборонено:'],
        bullets: [
          'Ображати, погрожувати, переслідувати або цькувати інших користувачів.',
          'Поширювати нелегальні матеріали, мову ворожнечі або сцени насильства.',
          'Використовувати ботів для спаму, скрапінгу або масових розсилок.',
          'Поширювати віруси або намагатися отримати несанкціонований доступ до систем.',
          'Порушувати авторські права та інтелектуальну власність.',
        ],
      },
    ],
  },
  {
    id: 'software-and-music',
    number: '6',
    title:
      'Програмне забезпечення, сторонні інтеграції (YouTube, Spotify, Twitch, Steam, Roblox, GitHub) та боти',
    iconName: 'Cpu',
    tldr: 'Клієнтське ПЗ надається за ліцензією. Голосові кімнати не записуються. Підключаючи сторонні платформи (YouTube, Spotify, Twitch, Steam, Roblox, GitHub), ви погоджуєтеся з їхніми умовами використання та політиками розробників.',
    subsections: [
      {
        id: 'software-license',
        title: '6.1 Ліцензія на клієнтські додатки',
        content: [
          'Ми надаємо вам персональну невиключну ліцензію на використання додатків Eternal для доступу до сервісу.',
        ],
      },
      {
        id: 'voice-hangouts-terms',
        title: '6.2 Голосові кімнати та політика нульового запису',
        content: [
          'Голосові та відеокімнати працюють у реальному часі за технологією WebRTC без запису чи збереження аудіо на серверах.',
        ],
      },
      {
        id: 'youtube-api-terms',
        title: '6.3 Умови використання YouTube API Services',
        content: [
          'Eternal використовує YouTube API Services. Підключаючи YouTube канал або переглядаючи контент YouTube на Eternal, ви прямо погоджуєтеся дотримуватися Умов використання YouTube (YouTube Terms of Service: https://www.youtube.com/t/terms) та підтверджуєте, що ваші дані оброблятимуться відповідно до Політики конфіденційності Google (Google Privacy Policy: https://policies.google.com/privacy).',
          'Ви можете в будь-який момент відкликати доступ на сторінці безпеки Google: https://security.google.com/settings/security/permissions.',
        ],
      },
      {
        id: 'spotify-terms',
        title: '6.4 Умови використання Spotify та права на музичний контент',
        content: [
          'Інтеграція зі Spotify реалізована за допомогою Spotify Web API. Усі назви пісень, обкладинки альбомів та імена виконавців є власністю Spotify AB або її ліцензіарів. Користувачам суворо заборонено копіювати, записувати чи завантажувати аудіопотоки.',
          'Відкликати доступ можна в Налаштуваннях або на сторінці https://www.spotify.com/account/apps/.',
        ],
      },
      {
        id: 'twitch-terms',
        title: '6.5 Умови використання Twitch та трансляції',
        content: [
          'Статус прямої трансляції підтримується через Twitch Helix API. Підключаючи Twitch, ви погоджуєтеся з Умовами використання Twitch (https://www.twitch.tv/p/legal/terms-of-service/) та Політикою конфіденційності Twitch (https://www.twitch.tv/p/legal/privacy-notice/).',
        ],
      },
      {
        id: 'steam-terms',
        title: '6.6 Угода передплатника Steam та відмова від відповідальності Valve',
        content: [
          'Інтеграція Steam працює через Steam OpenID 2.0 та Steam Web API. Steam та логотип Steam є торговельними марками Valve Corporation. Eternal не є афілійованим із Valve Corporation. Powered by Steam.',
          'Використання регулюється Угодою передплатника Steam (https://store.steampowered.com/subscriber_agreement/).',
        ],
      },
      {
        id: 'roblox-terms',
        title: '6.7 Умови використання Roblox',
        content: [
          'Дані Roblox отримуються через офіційні API Roblox. Roblox є зареєстрованою торговельною маркою Roblox Corporation. Eternal не є афілійованим із Roblox Corporation. Використання регулюється Умовами Roblox (https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use).',
        ],
      },
      {
        id: 'github-terms',
        title: '6.8 Умови використання GitHub',
        content: [
          'Інтеграція підпорядковується Умовам GitHub (https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) та Заяві про конфіденційність GitHub (https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement).',
        ],
      },
      {
        id: 'developer-bots-roadmap',
        title: '6.9 Боти та API для розробників',
        content: [
          'Розробники можуть створювати автоматизованих ботів через Портал розробників Eternal за умови дотримання лімітів та Умов для розробників.',
        ],
      },
    ],
  },
  {
    id: 'copyright-dmca',
    number: '7',
    title: 'Авторське право та інтелектуальна власність',
    iconName: 'FileText',
    tldr: 'Ми поважаємо авторські права. У разі виявлення порушення ви можете надіслати запит на видалення контенту (DMCA).',
    subsections: [
      {
        id: 'dmca-notices',
        title: '7.1 Повідомлення про порушення авторських прав',
        content: [
          'Якщо ви вважаєте, що контент на Eternal порушує ваші авторські права, надішліть офіційне повідомлення на copyright@eternal.app.',
        ],
      },
    ],
  },
  {
    id: 'termination-and-appeals',
    number: '8',
    title: 'Припинення дії та апеляції',
    iconName: 'KeyRound',
    tldr: 'Ви можете видалити акаунт у будь-який час в 1 клік. Ми можемо блокувати порушників правил. Ви маєте право подати апеляцію.',
    subsections: [
      {
        id: 'user-termination',
        title: '8.1 Видалення акаунта користувачем',
        content: [
          'Ви можете видалити свій профіль у будь-який момент у меню Налаштування → Безпека → Видалити акаунт. Контент приховується миттєво і повністю очищається з бекапів протягом 30 днів.',
        ],
      },
      {
        id: 'eternal-termination-appeals',
        title: '8.2 Блокування акаунтів та апеляції',
        content: [
          'Ми можемо призупинити дію акаунтів за грубі порушення Умов. Ви можете подати апеляцію, написавши на appeals@eternal.app.',
        ],
      },
    ],
  },
  {
    id: 'legal-disclaimers',
    number: '9',
    title: 'Юридичні застереження та вирішення спорів',
    iconName: 'ShieldCheck',
    tldr: 'Сервіс надається «як є». Спори вирішуються шляхом добросовісних перемовин.',
    subsections: [
      {
        id: 'as-is-disclaimer',
        title: '9.1 Сервіс «ЯК Є»',
        content: [
          'Eternal надається за принципом «ЯК Є» та «ЯК ДОСТУПНО» без будь-яких непрямих гарантій.',
        ],
      },
      {
        id: 'dispute-resolution',
        title: '9.2 Досудове врегулювання спорів',
        content: [
          'У разі виникнення спорів ви погоджуєтеся спочатку звернутися до нас за адресою legal@eternal.app для мирного вирішення питання.',
        ],
      },
    ],
  },
  {
    id: 'contact-us',
    number: '10',
    title: 'Зв’язатися з нами',
    iconName: 'Mail',
    tldr: 'Якщо у вас є запитання щодо цих Умов використання, наша юридична команда готова допомогти.',
    subsections: [
      {
        id: 'contact-details',
        title: '10.1 Контактна інформація',
        content: [
          'Юридичні питання: legal@eternal.app',
          'Конфіденційність: privacy@eternal.app',
          'Служба підтримки: support@eternal.app',
        ],
      },
    ],
  },
];

const UK_TERMS: TermsUITranslation = {
  navbar: getPrivacyTranslation('Українська').navbar,
  hero: {
    title: 'УМОВИ ВИКОРИСТАННЯ ETERNAL',
    effectiveDate:
      'Дата набрання чинності: 1 вересня 2026 р. • Останнє оновлення: 28 серпня 2026 р.',
    description:
      'Ці Умови використання регулюють використання стрічки публікацій, чатів, голосових кімнат та музики в Eternal. Ми зробили їх простими, прозорими та орієнтованими на користувача.',
  },
  toc: {
    contents: 'Зміст',
    readProgress: '% прочитано',
    print: 'Друк',
    backToTop: 'Нагору',
  },
  callout: {
    briefly: 'Коротко про це',
  },
  sections: UK_TERMS_SECTIONS,
};

// Language map
const TERMS_TRANSLATION_MAP: Record<SupportedLanguage, TermsUITranslation> = {
  English: EN_TERMS,
  'English (UK)': EN_TERMS,
  Українська: UK_TERMS,
  Deutsch: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Deutsch').navbar,
    hero: {
      title: 'ETERNAL NUTZUNGSBEDINGUNGEN',
      effectiveDate: 'Gültig ab: 1. September 2026 • Zuletzt aktualisiert: 28. August 2026',
      description:
        'Diese Nutzungsbedingungen legen unsere gegenseitige Vereinbarung für die Nutzung von Eternal fest.',
    },
    toc: {
      contents: 'Inhalt',
      readProgress: '% gelesen',
      print: 'Drucken',
      backToTop: 'Nach oben',
    },
    callout: { briefly: 'Kurz gesagt' },
  },
  Español: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Español').navbar,
    hero: {
      title: 'TÉRMINOS DE SERVICIO DE ETERNAL',
      effectiveDate:
        'Fecha de vigencia: 1 de septiembre de 2026 • Última actualización: 28 de agosto de 2026',
      description:
        'Estos Términos de servicio establecen nuestro acuerdo legal cuando usas Eternal.',
    },
    toc: {
      contents: 'Contenido',
      readProgress: '% leído',
      print: 'Imprimir',
      backToTop: 'Volver arriba',
    },
    callout: { briefly: 'En resumen' },
  },
  Français: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Français').navbar,
    hero: {
      title: 'CONDITIONS D’UTILISATION D’ETERNAL',
      effectiveDate:
        'Date d’entrée en vigueur : 1er septembre 2026 • Dernière mise à jour : 28 août 2026',
      description:
        'Ces Conditions d’utilisation définissent notre accord lorsque vous utilisez Eternal.',
    },
    toc: {
      contents: 'Sommaire',
      readProgress: '% lu',
      print: 'Imprimer',
      backToTop: 'Haut de page',
    },
    callout: { briefly: 'En résumé' },
  },
  Italiano: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Italiano').navbar,
    hero: { ...EN_TERMS.hero, title: 'TERMINI DI SERVIZIO DI ETERNAL' },
    toc: { ...EN_TERMS.toc, contents: 'Indice', print: 'Stampa' },
    callout: { briefly: 'In breve' },
  },
  Magyar: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Magyar').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL FELHASZNÁLÁSI FELTÉTELEK' },
    toc: { ...EN_TERMS.toc, contents: 'Tartalom', print: 'Nyomtatás' },
    callout: { briefly: 'Röviden erről' },
  },
  Nederlands: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Nederlands').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL GEBRUIKSVOORWAARDEN' },
    toc: { ...EN_TERMS.toc, contents: 'Inhoudsopgave', print: 'Afdrukken' },
    callout: { briefly: 'Kort hierover' },
  },
  Polski: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Polski').navbar,
    hero: { ...EN_TERMS.hero, title: 'WARUNKI KORZYSTANIA Z ETERNAL' },
    toc: { ...EN_TERMS.toc, contents: 'Spis treści', print: 'Drukuj' },
    callout: { briefly: 'Krótko o tym' },
  },
  'Português (Brasil)': {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Português (Brasil)').navbar,
    hero: { ...EN_TERMS.hero, title: 'TERMOS DE SERVIÇO DA ETERNAL' },
    toc: { ...EN_TERMS.toc, contents: 'Índice', print: 'Imprimir' },
    callout: { briefly: 'Em resumo' },
  },
  Türkçe: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Türkçe').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL KULLANIM KOŞULLARI' },
    toc: { ...EN_TERMS.toc, contents: 'İçindekiler', print: 'Yazdır' },
    callout: { briefly: 'Kısaca bu konuda' },
  },
  日本語: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('日本語').navbar,
    hero: {
      title: 'ETERNAL 利用規約',
      effectiveDate: '発効日：2026年9月1日 • 最終更新：2026年8月28日',
      description: '本利用規約は、Eternalのサービスをご利用いただく際の法的条件を定めるものです。',
    },
    toc: { contents: '目次', readProgress: '% 読了', print: '印刷', backToTop: 'トップへ戻る' },
    callout: { briefly: '概要' },
  },
  한국어: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('한국어').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL 서비스 이용약관' },
    toc: { ...EN_TERMS.toc, contents: '목차', print: '인쇄' },
    callout: { briefly: '간단히 보기' },
  },
  繁體中文: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('繁體中文').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL 服務條款' },
    toc: { ...EN_TERMS.toc, contents: '目錄', print: '列印' },
    callout: { briefly: '簡要說明' },
  },
  简体中文: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('简体中文').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL 服务条款' },
    toc: { ...EN_TERMS.toc, contents: '目录', print: '打印' },
    callout: { briefly: '简要说明' },
  },
};

export const getTermsTranslation = (lang: SupportedLanguage): TermsUITranslation => {
  return TERMS_TRANSLATION_MAP[lang] || EN_TERMS;
};
