import type { LegalDocumentHero } from './types';

export interface GuidelinesSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface GuidelinesSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: GuidelinesSubsection[];
}

export const GUIDELINES_SECTIONS: GuidelinesSection[] = [
  {
    id: 'welcome-and-values',
    number: '1',
    title: 'Welcome to Eternal & Our Community Values',
    iconName: 'ShieldCheck',
    tldr: 'Eternal is built for authentic connections across feeds, chats, voice hangouts, and music. Our Community Guidelines ensure everyone can express themselves safely.',
    subsections: [
      {
        id: 'our-mission-and-scope',
        title: '1.1 Community Mission & Scope',
        content: [
          'Eternal brings people together around creativity, communication, and shared interests. Whether you are sharing photos in your visual feed, chatting in private groups, hanging out in live voice rooms, or listening to music with friends, these Community Guidelines apply to all content, interactions, servers, and connected apps.',
          'These rules are incorporated into our Terms of Service. By using Eternal, you agree to uphold these standards and help maintain a positive, welcoming environment for everyone.',
        ],
        bullets: [
          'Treat others with respect, kindness, and empathy.',
          'Respect the diverse communities, cultures, and voices across the platform.',
          'Help us keep Eternal safe by reporting behavior or content that breaks these rules.',
        ],
      },
    ],
  },
  {
    id: 'respect-each-other',
    number: '2',
    title: 'Respect Each Other & Anti-Harassment',
    iconName: 'HeartHandshake',
    tldr: 'Harassment, bullying, hate speech, violent threats, and doxxing have zero place on Eternal. We protect our community from targeted abuse.',
    subsections: [
      {
        id: 'harassment-and-bullying',
        title: '2.1 Bullying, Harassment & Raiding',
        content: ['Do not harass, intimidate, stalk, or demean anyone. We strictly prohibit:'],
        bullets: [
          'Direct or indirect harassment, sexual harassment, or coordinated brigade attacks ("raiding") on profiles, groups, or voice rooms.',
          'Evading blocks or server bans by using secondary accounts or proxies.',
          'Repeatedly sending unwanted messages or calls to users who have asked you to stop.',
        ],
      },
      {
        id: 'threats-and-violence',
        title: '2.2 Threats of Harm & Violent Extremism',
        content: [
          'Do not make threats of physical violence against any individual, group, or public entity. This includes direct, indirect, or suggestive threats.',
          'Do not promote, organize, or glorify violent extremism, terrorist organizations, mass casualty events, or hate groups.',
        ],
      },
      {
        id: 'doxxing-and-privacy',
        title: '2.3 Doxxing & Privacy Invasions',
        content: [
          'Do not share, publish, or threaten to expose anyone’s personally identifiable information (PII)—such as residential addresses, phone numbers, private emails, national IDs, or financial records—without their explicit consent.',
        ],
      },
      {
        id: 'hate-speech',
        title: '2.4 Hate Speech & Discrimination',
        content: [
          'Eternal does not tolerate hate speech. Do not attack, dehumanize, incite violence, or promote hatred against individuals or groups based on protected characteristics including race, ethnicity, nationality, religion, sexual orientation, gender identity, age, or disability.',
        ],
      },
    ],
  },
  {
    id: 'child-and-teen-safety',
    number: '3',
    title: 'Child & Teen Safety (Zero Tolerance)',
    iconName: 'ShieldCheck',
    tldr: 'We maintain an absolute zero-tolerance policy against Child Sexual Exploitation and Abuse (CSAM) and strictly enforce our 13+ (or 16+ in EU) age limits.',
    subsections: [
      {
        id: 'csam-zero-tolerance',
        title: '3.1 Zero Tolerance for CSAM & Grooming',
        content: [
          'We have zero tolerance for any content that depicts, promotes, facilitates, or normalizes child sexual exploitation or abuse (CSAM). This includes real, simulated, drawn, animated, or AI-generated imagery involving minors.',
          'We immediately report all instances of CSAM, grooming, or child endangerment to the National Center for Missing & Exploited Children (NCMEC) and law enforcement authorities worldwide.',
        ],
      },
      {
        id: 'minor-protection',
        title: '3.2 Protecting Young Users',
        content: [
          'Users must meet the minimum digital age (13+, or 16+ in certain EU jurisdictions). Adults are strictly forbidden from soliciting, exchanging intimate media with, or engaging in inappropriate sexual behavior with minors.',
        ],
      },
    ],
  },
  {
    id: 'sensitive-and-adult-content',
    number: '4',
    title: 'Adult, Sensitive & Graphic Content',
    iconName: 'Eye',
    tldr: 'Sexually explicit content is strictly restricted. Non-consensual imagery, self-harm, gore, and animal cruelty are completely prohibited.',
    subsections: [
      {
        id: 'adult-content-rules',
        title: '4.1 Age-Restricted & Adult Content',
        content: [
          'Sexually explicit adult content must never be posted in open, non-age-restricted spaces. Avatars, bios, profile banners, stories, explore feeds, and emoji must remain suitable for general audiences.',
          'Communities containing consensual adult discussions or artwork must be marked with age-restricted tags and are accessible only to verified adult users.',
        ],
      },
      {
        id: 'non-consensual-media',
        title: '4.2 Non-Consensual Intimate Imagery (NCII)',
        content: [
          'Do not create, share, or threaten to share non-consensual intimate imagery (NCII), including revenge pornography and synthetic/AI-generated deepfakes. Accounts found sharing NCII are permanently banned immediately.',
        ],
      },
      {
        id: 'self-harm-and-violence',
        title: '4.3 Self-Harm, Suicide & Graphic Violence',
        content: [
          'Do not post content that encourages, glorifies, or provides instructions for suicide or self-harm (including eating disorders). If you or someone you know is in crisis, please seek immediate professional help or contact emergency crisis lines.',
          'Do not upload graphic gore, extreme violence, or animal abuse with the intent to shock, disgust, or harass others.',
        ],
      },
    ],
  },
  {
    id: 'platform-integrity',
    number: '5',
    title: 'Platform Integrity, Bot APIs & Anti-Scam Rules',
    iconName: 'Cpu',
    tldr: 'Do not spam, use unauthorized user-bots, sell accounts, phish, or run deceptive sponsorships without proper disclosures (#ad).',
    subsections: [
      {
        id: 'spam-and-automation',
        title: '5.1 Spam, Raids & Developer Bot Standards',
        content: [
          'Do not send bulk unsolicited messages, invite spam, or deploy automated user-bots (self-bots). All automated bot integrations must be registered through the official Eternal Developer Portal and follow our Developer Policy.',
        ],
      },
      {
        id: 'commercial-sponsorship-rules',
        title: '5.2 Commercial Disclosures & Influencer Transparency',
        content: [
          'All creators and brands publishing sponsored posts, product placements, or affiliate endorsements must clearly disclose commercial relationships using clear visual markers or hashtags (e.g. #ad, #sponsored) in accordance with global consumer protection standards.',
        ],
      },
      {
        id: 'asset-sales-and-impersonation',
        title: '5.3 Account Sales & Impersonation',
        content: [
          'Do not sell, buy, or trade Eternal accounts, usernames, vanity handles, or community permissions.',
          'Do not impersonate real people, brands, celebrities, or Eternal staff to deceive, defraud, or mislead others.',
        ],
      },
      {
        id: 'security-phishing-scams',
        title: '5.4 Phishing, Malware & Financial Scams',
        content: [
          'Do not engage in phishing, distribute malware, conduct DDoS attacks, or run deceptive crypto/financial investment scams.',
        ],
      },
    ],
  },
  {
    id: 'voice-and-music',
    number: '6',
    title: 'Voice Hangouts & Music Etiquette',
    iconName: 'Database',
    tldr: 'Keep voice and video rooms welcoming. Zero unauthorized recording, no audio blasting, and respect copyright when listening to music.',
    subsections: [
      {
        id: 'voice-room-safety',
        title: '6.1 Voice & Video Room Conduct',
        content: [
          'Voice channels operate in real time without server recordings. Users must respect room guidelines: no microphone soundboards to disrupt conversations, no unannounced voice recording of others, and no hate speech in live calls.',
        ],
      },
      {
        id: 'music-playback',
        title: '6.2 Music Streaming & Rich Presence',
        content: [
          'When sharing your Spotify or SoundCloud status, remember that friends can see your track info. You can use Ghost Mode at any time to hide your listening activity.',
        ],
      },
    ],
  },
  {
    id: 'enforcement-and-appeals',
    number: '7',
    title: 'Enforcement, Warnings & Appeals',
    iconName: 'KeyRound',
    tldr: 'We enforce these rules fairly using warnings, content removal, or account bans. You have the right to appeal moderation actions.',
    subsections: [
      {
        id: 'enforcement-system',
        title: '7.1 Our Tiered Warning System',
        content: [
          'When violations occur, our Trust & Safety team takes proportionate action depending on severity:',
        ],
        bullets: [
          'Educational Warnings: First-time minor infractions receive in-app notices.',
          'Content Removals: Posts, stories, or messages that violate rules are deleted.',
          'Account Suspensions: Temporary timeouts or restricted feature access.',
          'Permanent Bans: Severe or repeat violations (e.g. CSAM, doxxing, scams) result in immediate, permanent termination.',
        ],
      },
      {
        id: 'appeals-process',
        title: '7.2 Submitting an Appeal',
        content: [
          'If you believe a moderation action on your account or server was made in error, you can submit an appeal to appeals@eternal.app with your username, case ID, and explanation. EU residents may submit appeals within 6 months of notice.',
        ],
      },
    ],
  },
  {
    id: 'reporting-and-contact',
    number: '8',
    title: 'Reporting Violations & Contact',
    iconName: 'Mail',
    tldr: 'Help us protect the community. You can report violations directly in the app or reach our Trust & Safety team anytime.',
    subsections: [
      {
        id: 'how-to-report',
        title: '8.1 How to Report Violations',
        content: [
          'To report a post, message, or user directly in Eternal: click the three dots (...) next to any message or post and select "Report".',
          'For urgent safety concerns, bug bounties, or law enforcement inquiries, email safety@eternal.app or security@eternal.app.',
        ],
      },
    ],
  },
];

export const GUIDELINES_SECTIONS_UK: GuidelinesSection[] = [
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

export const GUIDELINES_HERO: Record<'en' | 'uk', LegalDocumentHero> = {
  en: {
    title: 'ETERNAL COMMUNITY GUIDELINES',
    effectiveDate: 'Effective Date: September 1, 2026 • Last Updated: August 28, 2026',
    description:
      'Eternal brings people together around feeds, chats, voice channels, and music. Our Community Guidelines ensure everyone can express themselves safely and find belonging without harming others.',
  },
  uk: {
    title: 'ПРАВИЛА СПІЛЬНОТИ ETERNAL',
    effectiveDate:
      'Дата набрання чинності: 1 вересня 2026 р. • Останнє оновлення: 28 серпня 2026 р.',
    description:
      'Eternal об’єднує людей навколо публікацій, чатів, голосових кімнат та музики. Наші Правила спільноти забезпечують безпечний простір для самовираження кожного користувача.',
  },
};
