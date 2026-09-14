import { SupportedLanguage } from '../../../shared/lib/language/languageStore';
import { GUIDELINES_SECTIONS, GuidelinesSection } from './guidelinesContent';
import { getLegalTranslation as getPrivacyTranslation } from '../../Privacy/data/privacyTranslations';

export interface GuidelinesUITranslation {
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
  sections: GuidelinesSection[];
}

// 1. English (Default)
const EN_GUIDELINES: GuidelinesUITranslation = {
  navbar: getPrivacyTranslation('English').navbar,
  hero: {
    title: 'ETERNAL COMMUNITY GUIDELINES',
    effectiveDate: 'Effective Date: September 1, 2026 • Last Updated: August 28, 2026',
    description:
      'Eternal brings people together around feeds, chats, voice channels, and music. Our Community Guidelines ensure everyone can express themselves safely and find belonging without harming others.',
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
  sections: GUIDELINES_SECTIONS,
};

// 2. Ukrainian (Українська)
const UK_GUIDELINES_SECTIONS: GuidelinesSection[] = [
  {
    id: 'welcome-and-values',
    number: '1',
    title: 'Ласкаво просимо в Eternal та цінності спільноти',
    iconName: 'ShieldCheck',
    tldr: 'Eternal створений для щирого спілкування у стрічці, чатах, голосових кімнатах та музиці. Наші Правила гарантують безпеку та повагу для кожного.',
    subsections: [
      {
        id: 'our-mission-and-scope',
        title: '1.1 Місія та правила спільноти',
        content: [
          'Eternal об’єднує людей навколо творчості, спілкування та спільних інтересів. Незалежно від того, чи публікуєте ви фото у стрічці, спілкуєтеся в приватних чатах, проводите час у голосових кімнатах чи слухаєте музику разом, ці Правила спільноти застосовуються до всіх користувачів і контенту.',
          'Ці правила є частиною наших Умов використання. Використовуючи Eternal, ви погоджуєтеся підтримувати дружню та безпечну атмосферу.',
        ],
        bullets: [
          'Ставтеся до інших з повагою, доброзичливістю та взаєморозумінням.',
          'Поважайте різноманітність думок та культур у спільноті.',
          'Допомагайте нам зберігати безпеку, повідомляючи про порушення правил.',
        ],
      },
    ],
  },
  {
    id: 'respect-each-other',
    number: '2',
    title: 'Повага один до одного та захист від цькування',
    iconName: 'HeartHandshake',
    tldr: 'Цькування, погрози, мова ворожнечі та деанонімізація (доксинг) суворо заборонені в Eternal.',
    subsections: [
      {
        id: 'harassment-and-bullying',
        title: '2.1 Захист від булінгу та рейдів',
        content: [
          'Заборонено ображати, переслідувати або принижувати інших користувачів. Ми суворо забороняємо:',
        ],
        bullets: [
          'Цькування, сексуальні домагання та скоординовані рейди на профілі або групи.',
          'Обхід блокувань за допомогою створення додаткових акаунтів.',
          'Нав’язливі дзвінки та спам-повідомлення після прохання припинити.',
        ],
      },
      {
        id: 'threats-and-violence',
        title: '2.2 Погрози та насильницький екстремізм',
        content: [
          'Заборонено висловлювати погрози фізичного насильства у будь-якій формі.',
          'Заборонено пропагувати, підтримувати або координувати діяльність екстремістських чи терористичних угруповань.',
        ],
      },
      {
        id: 'doxxing-and-privacy',
        title: '2.3 Доксинг та порушення приватності',
        content: [
          'Заборонено публікувати або погрожувати публікацією персональних даних (адреси, номери телефонів, паспорти, банківські картки) без згоди власника.',
        ],
      },
      {
        id: 'hate-speech',
        title: '2.4 Мова ворожнечі та дискримінація',
        content: [
          'В Eternal заборонена мова ворожнечі та дискримінація за ознаками раси, національності, релігії, сексуальної орієнтації, статі чи стану здоров’я.',
        ],
      },
    ],
  },
  {
    id: 'child-and-teen-safety',
    number: '3',
    title: 'Захист дітей та підлітків (Нульова толерантність)',
    iconName: 'ShieldCheck',
    tldr: 'Ми дотримуємося нульової толерантності до сексуальної експлуатації дітей (CSAM) та суворо контролюємо віковий ценз 13+ (16+ у ЄС).',
    subsections: [
      {
        id: 'csam-zero-tolerance',
        title: '3.1 Нульова толерантність до CSAM',
        content: [
          'Ми категорично забороняємо будь-який контент сексуального насильства чи експлуатації неповнолітніх (включно зі штучно згенерованим або мальованим).',
          'Ми негайно передаємо всі матеріали про такі порушення до NCMEC та правоохоронних органів.',
        ],
      },
      {
        id: 'minor-protection',
        title: '3.2 Безпека юних користувачів',
        content: [
          'Користувачі повинні відповідати віковим нормам (13+, 16+ у ЄС). Дорослим суворо заборонено схиляти підлітків до небажаного листування.',
        ],
      },
    ],
  },
  {
    id: 'sensitive-and-adult-content',
    number: '4',
    title: 'Чутливий та дорослий контент',
    iconName: 'Eye',
    tldr: 'Відвертий контент дозволений лише у вікових групах 18+. Зливи інтимних фото, пропаганда самоушкодження та жорстокість заборонені.',
    subsections: [
      {
        id: 'adult-content-rules',
        title: '4.1 Контент для дорослих (18+)',
        content: [
          'Відвертий контент суворо заборонений у відкритих місцях: аватарках, описах профілю, загальній стрічці та історіях.',
          'Спільноти з дорослими обговореннями мають бути позначені міткою 18+.',
        ],
      },
      {
        id: 'non-consensual-media',
        title: '4.2 Неконсенсуальні інтимні матеріали (NCII)',
        content: [
          'Заборонено створення та поширення інтимних матеріалів без згоди людини (зокрема діпфейків). Такі акаунти блокуються назавжди.',
        ],
      },
      {
        id: 'self-harm-and-violence',
        title: '4.3 Самоушкодження та сцени жорстокості',
        content: [
          'Заборонено пропаганду суїциду, розладів харчової поведінки, а також поширення сцен жорстокості над людьми чи тваринами.',
        ],
      },
    ],
  },
  {
    id: 'platform-integrity',
    number: '5',
    title: 'Цілісність платформи та боротьба з шахрайством',
    iconName: 'Cpu',
    tldr: 'Заборонено спамити, використовувати ботів-саморобів, продавати акаунти, зламувати профілі та займатися фінансовим шахрайством.',
    subsections: [
      {
        id: 'spam-and-automation',
        title: '5.1 Спам та несанкціоновані боти',
        content: ['Заборонено масові розсилки, спам-боти та використання неофіційних юзер-ботів.'],
      },
      {
        id: 'asset-sales-and-impersonation',
        title: '5.2 Продаж акаунтів та видавання себе за іншого',
        content: [
          'Заборонено купувати чи продавати профілі, нікнейми або посилання на спільноти. Заборонено видавати себе за адміністрацію Eternal або інших людей.',
        ],
      },
      {
        id: 'security-phishing-scams',
        title: '5.3 Фішинг та фінансове шахрайство',
        content: [
          'Заборонено фішингові атаки, поширення вірусів, крипто-скам та схеми швидкого збагачення.',
        ],
      },
    ],
  },
  {
    id: 'voice-and-music',
    number: '6',
    title: 'Голосові кімнати та етикет музики',
    iconName: 'Database',
    tldr: 'Зберігайте дружню атмосферу в голосових каналах: жодних саундпадів для зриву розмов та таємних записів голосу.',
    subsections: [
      {
        id: 'voice-room-safety',
        title: '6.1 Поведінка в голосових каналах',
        content: [
          'Голосові канали працюють наживо. Заборонено глушити учасників шумом, записувати розмови без згоди та порушувати правила кімнати.',
        ],
      },
      {
        id: 'music-playback',
        title: '6.2 Статус музики (Ghost Mode)',
        content: [
          'При трансляції музики зі Spotify або SoundCloud ви можете в будь-який момент увімкнути Режим невидимки (Ghost Mode).',
        ],
      },
    ],
  },
  {
    id: 'enforcement-and-appeals',
    number: '7',
    title: 'Заходи впливу, попередження та апеляції',
    iconName: 'KeyRound',
    tldr: 'Ми діємо справедливо: від попереджень та видалення постів до блокування порушників. Ви можете оскаржити будь-яке рішення.',
    subsections: [
      {
        id: 'enforcement-system',
        title: '7.1 Рівні покарань за порушення',
        content: ['Залежно від серйозності порушення застосовуються:'],
        bullets: [
          'Попередження: Повідомлення про незначні перші порушення.',
          'Видалення контенту: Видалення дописів або повідомлень, що порушують правила.',
          'Тимчасове обмеження: Обмеження доступу до окремих функцій.',
          'Повне блокування: Безповоротне блокування акаунта за грубі порушення.',
        ],
      },
      {
        id: 'appeals-process',
        title: '7.2 Подання апеляції',
        content: [
          'Якщо ви вважаєте, що покарання було помилковим, надішліть апеляцію на appeals@eternal.app із вашим нікнеймом та описом ситуації.',
        ],
      },
    ],
  },
  {
    id: 'reporting-and-contact',
    number: '8',
    title: 'Як поскаржитися та контакти',
    iconName: 'Mail',
    tldr: 'Повідомляйте про порушення прямо в додатку або звертайтеся до нашої служби безпеки.',
    subsections: [
      {
        id: 'how-to-report',
        title: '8.1 Повідомлення про порушення',
        content: [
          'Щоб поскаржитися на допис чи користувача, натисніть три крапки (...) біля повідомлення чи профілю та виберіть «Поскаржитися».',
          'Служба безпеки: safety@eternal.app | Технічна безпека: security@eternal.app.',
        ],
      },
    ],
  },
];

const UK_GUIDELINES: GuidelinesUITranslation = {
  navbar: getPrivacyTranslation('Українська').navbar,
  hero: {
    title: 'ПРАВИЛА СПІЛЬНОТИ ETERNAL',
    effectiveDate:
      'Дата набрання чинності: 1 вересня 2026 р. • Останнє оновлення: 28 серпня 2026 р.',
    description:
      'Eternal об’єднує людей навколо публікацій, чатів, голосових кімнат та музики. Наші Правила спільноти забезпечують безпечний простір для самовираження кожного користувача.',
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
  sections: UK_GUIDELINES_SECTIONS,
};

// Translation Map for all supported languages
const GUIDELINES_TRANSLATION_MAP: Record<SupportedLanguage, GuidelinesUITranslation> = {
  English: EN_GUIDELINES,
  'English (UK)': EN_GUIDELINES,
  Українська: UK_GUIDELINES,
  Deutsch: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Deutsch').navbar,
    hero: {
      title: 'ETERNAL COMMUNITY-RICHTLINIEN',
      effectiveDate: 'Gültig ab: 1. September 2026 • Zuletzt aktualisiert: 28. August 2026',
      description: 'Unsere Richtlinien sorgen für ein sicheres und freundliches Miteinander.',
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
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Español').navbar,
    hero: {
      title: 'DIRECTRICES DE LA COMUNIDAD DE ETERNAL',
      effectiveDate:
        'Fecha de vigencia: 1 de septiembre de 2026 • Última actualización: 28 de agosto de 2026',
      description: 'Nuestras directrices garantizan un espacio seguro y respetuoso para todos.',
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
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Français').navbar,
    hero: {
      title: 'CHARTE DE LA COMMUNAUTÉ D’ETERNAL',
      effectiveDate:
        'Date d’entrée en vigueur : 1er septembre 2026 • Dernière mise à jour : 28 août 2026',
      description: 'Notre charte garantit un espace sûr et bienveillant pour chacun.',
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
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Italiano').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'LINEE GUIDA DELLA COMMUNITY DI ETERNAL' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Indice', print: 'Stampa' },
    callout: { briefly: 'In breve' },
  },
  Magyar: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Magyar').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL KÖZÖSSÉGI IRÁNYELVEK' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Tartalom', print: 'Nyomtatás' },
    callout: { briefly: 'Röviden erről' },
  },
  Nederlands: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Nederlands').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL COMMUNITYRICHTLIJNEN' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Inhoudsopgave', print: 'Afdrukken' },
    callout: { briefly: 'Kort hierover' },
  },
  Polski: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Polski').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'WYTYCZNE DLA SPOŁECZNOŚCI ETERNAL' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Spis treści', print: 'Drukuj' },
    callout: { briefly: 'Krótko o tym' },
  },
  'Português (Brasil)': {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Português (Brasil)').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'DIRETRIZES DA COMUNIDADE DA ETERNAL' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Índice', print: 'Imprimir' },
    callout: { briefly: 'Em resumo' },
  },
  Türkçe: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Türkçe').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL TOPLULUK KURALLARI' },
    toc: { ...EN_GUIDELINES.toc, contents: 'İçindekiler', print: 'Yazdır' },
    callout: { briefly: 'Kısaca bu konuda' },
  },
  日本語: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('日本語').navbar,
    hero: {
      title: 'ETERNAL コミュニティガイドライン',
      effectiveDate: '発効日：2026年9月1日 • 最終更新：2026年8月28日',
      description: 'すべてのユーザーが安心・安全に自己表現できるコミュニティを目指しています。',
    },
    toc: { contents: '目次', readProgress: '% 読了', print: '印刷', backToTop: 'トップへ戻る' },
    callout: { briefly: '概要' },
  },
  한국어: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('한국어').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL 커뮤니티 가이드라인' },
    toc: { ...EN_GUIDELINES.toc, contents: '목차', print: '인쇄' },
    callout: { briefly: '간단히 보기' },
  },
  繁體中文: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('繁體中文').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL 社群守則' },
    toc: { ...EN_GUIDELINES.toc, contents: '目錄', print: '列印' },
    callout: { briefly: '簡要說明' },
  },
  简体中文: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('简体中文').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL 社区准则' },
    toc: { ...EN_GUIDELINES.toc, contents: '目录', print: '打印' },
    callout: { briefly: '简要说明' },
  },
};

export const getGuidelinesTranslation = (lang: SupportedLanguage): GuidelinesUITranslation => {
  return GUIDELINES_TRANSLATION_MAP[lang] || EN_GUIDELINES;
};
