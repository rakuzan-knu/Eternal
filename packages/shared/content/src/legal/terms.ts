import type { LegalDocumentHero } from './types';

export interface TermsSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface TermsSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: TermsSubsection[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'who-we-are',
    number: '1',
    title: 'Welcome to Eternal & Who We Are',
    iconName: 'ShieldCheck',
    tldr: 'Welcome to Eternal! These Terms set forth our mutual legal agreement for using our unified social platform across web, mobile, and desktop.',
    subsections: [
      {
        id: 'welcome-and-mission',
        title: '1.1 Welcome to Eternal',
        content: [
          'Eternal is a modern social matrix designed to bring people together. We combine visual media feeds, direct messaging with disappearing chats, real-time voice and video hangout rooms, and seamless music listening into one unified experience.',
          'These Terms of Service ("Terms") govern your access to and use of Eternal’s websites, apps, and related services. When you create an account or use Eternal, you agree to follow these Terms, our Privacy Policy, and our Community Guidelines.',
        ],
        bullets: [
          'By using Eternal, you agree to treat others with respect and follow our community rules.',
          'We provide powerful privacy and customization controls so you can shape your social experience.',
          'If you do not agree to these Terms, you may not use our services.',
        ],
      },
      {
        id: 'company-details',
        title: '1.2 Who Runs Eternal',
        content: [
          'When we say "Eternal", "we", "us", or "our", we mean Ag Mykola and Ag Mihal, the founders operating the Eternal project in Ukraine.',
        ],
      },
    ],
  },
  {
    id: 'age-requirements',
    number: '2',
    title: 'Age Requirements & Guardian Responsibility',
    iconName: 'Database',
    tldr: 'You must be at least 13 years old (or 16+ in the EU) to use Eternal. Parents and legal guardians are responsible for accounts created by minors.',
    subsections: [
      {
        id: 'minimum-age',
        title: '2.1 Minimum Age Requirements',
        content: [
          'By accessing Eternal, you confirm that you are at least 13 years old and meet the minimum digital consent age required by the laws in your country (such as 16 in certain European Union countries).',
          'Our services are not intended for children under 13. If we learn that an account belongs to someone under the required age, we will immediately terminate the account and remove their data.',
        ],
      },
      {
        id: 'parents-and-guardians',
        title: '2.2 Responsibility of Parents and Guardians',
        content: [
          'If you are a parent or legal guardian allowing a minor (who meets the minimum age in your jurisdiction) to use Eternal, you agree to be bound by these Terms and are responsible for their activity, safety settings, and any purchases made on the platform.',
        ],
      },
    ],
  },
  {
    id: 'what-you-can-expect',
    number: '3',
    title: 'What You Can Expect from Us',
    iconName: 'Cpu',
    tldr: 'We provide visual feeds, instant chats, voice/video hangouts, and music streaming. We constantly evolve our features and work to keep the platform safe and available.',
    subsections: [
      {
        id: 'service-features',
        title: '3.1 The Eternal Social Experience',
        content: ['Eternal provides a multi-dimensional social platform consisting of:'],
        bullets: [
          'Visual Feeds: Photo and story sharing, reels, captions, and interactive comments.',
          'Direct Messaging: Real-time 1-on-1 chats, group conversations, media attachments, and optional disappearing messages.',
          'Voice & Video Hangouts: Low-latency audio and video rooms with screen sharing and zero recordings.',
          'Music Integrations: Connecting Spotify or SoundCloud to show your currently playing song and enable friends to listen along.',
        ],
      },
      {
        id: 'service-evolution',
        title: '3.2 Improving and Evolving the Platform',
        content: [
          'We actively build new features to improve Eternal. As part of this, we may add, modify, or retire certain features or services over time. We strive to minimize disruptions, but cannot guarantee uninterrupted 100% uptime.',
        ],
      },
    ],
  },
  {
    id: 'your-account',
    number: '4',
    title: 'Your Eternal Account & Security',
    iconName: 'KeyRound',
    tldr: 'You are responsible for keeping your account login details secure. Never sell or transfer your account or username to others.',
    subsections: [
      {
        id: 'account-creation',
        title: '4.1 Creating and Securing Your Account',
        content: [
          'To use Eternal, you must create an account with an email, username, and secure password. You agree to provide accurate information and keep it up to date.',
          'You are responsible for all activity that occurs under your account. We strongly recommend enabling Two-Factor Authentication (2FA) and using a unique, strong password. If you suspect your account has been compromised, notify us immediately at security@eternal.app.',
        ],
      },
      {
        id: 'account-transfer',
        title: '4.2 Prohibited Transfers & Username Ownership',
        content: [
          'You may not sell, rent, license, or transfer your Eternal account, username, or custom vanity URLs to anyone else. Eternal reserves the right to reclaim usernames or identifiers that infringe trademarks, violate policies, or have remained inactive for over two years.',
        ],
      },
    ],
  },
  {
    id: 'content-and-conduct',
    number: '5',
    title: 'Content on Eternal, Creator Rules & Conduct',
    iconName: 'Eye',
    tldr: 'You own the content you post. Commercial and sponsored posts must be clearly labeled (#ad). You are responsible for audio in reels. Illegal file hosting is prohibited.',
    subsections: [
      {
        id: 'your-content-license',
        title: '5.1 Your Content & License to Eternal',
        content: [
          'You retain full intellectual property ownership of any photos, videos, stories, audio notes, and messages you upload to Eternal.',
          'By submitting content, you grant Eternal a worldwide, royalty-free, non-exclusive license to host, store, display, format, and distribute that content solely for the purpose of operating, improving, and delivering the services to you and the audience you choose (such as public or approved followers).',
        ],
      },
      {
        id: 'sponsored-content-disclosures',
        title: '5.2 Sponsored Posts, Brand Partnerships & Creator Disclosures',
        content: [
          'If you post content on Eternal in exchange for compensation, sponsorship, free goods, or affiliate commissions, you are legally required to comply with commercial disclosure laws (such as FTC guidelines and EU consumer protection regulations).',
          'You must clearly and conspicuously disclose the sponsored nature of the post (e.g. using clear hashtags like #ad, #sponsored, or our creator partnership tools). Eternal is not responsible for non-compliant promotional activities conducted by individual users.',
        ],
      },
      {
        id: 'audio-and-media-copyright',
        title: '5.3 Reels, Video & UGC Audio Rights',
        content: [
          'When creating and publishing reels, stories, or video posts containing background music or audio clips, you affirm that you have the necessary licenses or permissions. If a copyright holder submits a valid claim against an audio track in your video, Eternal may mute, disable, or remove the corresponding audio stream.',
        ],
      },
      {
        id: 'fair-storage-policy',
        title: '5.4 Fair Use File Storage Policy',
        content: [
          'Eternal provides media sharing and attachments for organic social communication. You agree not to abuse our storage infrastructure by using Eternal as a bulk file repository, torrent indexing CDN, or automated cloud backup warehouse.',
        ],
      },
      {
        id: 'community-rules',
        title: '5.5 Prohibited Behavior & Rules of Conduct',
        content: ['To ensure Eternal remains a welcoming community, you agree not to:'],
        bullets: [
          'Harass, threaten, stalk, impersonate, or intimidate other users.',
          'Post or distribute illegal material, hate speech, non-consensual imagery, or violent content.',
          'Deploy automated scraping tools, spam bots, or unauthorized mass-messaging scripts.',
          'Distribute viruses, malware, trojans, or attempt unauthorized access to our servers.',
          'Infringe any copyright, trademark, or intellectual property rights of others.',
        ],
      },
    ],
  },
  {
    id: 'software-and-music',
    number: '6',
    title: 'Software, Voice Hangouts, Third-Party Integrations & Developer Bots',
    iconName: 'Cpu',
    tldr: 'Client software is licensed, not sold. Voice hangouts are zero-recording. By connecting third-party platforms (YouTube, Spotify, Twitch, Steam, Roblox, GitHub), you agree to their respective terms of service and developer policies.',
    subsections: [
      {
        id: 'software-license',
        title: '6.1 Client Software License',
        content: [
          'We grant you a personal, non-exclusive, non-transferable license to download and use the Eternal web, desktop, and mobile applications solely to access our services. You may not copy, distribute, reverse engineer, decompile, or modify our proprietary software without written permission, except where applicable law or a separate applicable license permits it. This client license does not authorize use of proprietary source code, self-hosting, or operation of a separate service. Third-party licenses and valid earlier grants remain unaffected.',
        ],
      },
      {
        id: 'voice-hangouts-terms',
        title: '6.2 Voice Hangouts & Zero-Recording Policy',
        content: [
          'Voice and video rooms operate in real time over WebRTC. Eternal never records, listens to, or saves live audio/video calls on our servers.',
        ],
      },
      {
        id: 'youtube-api-terms',
        title: '6.3 YouTube API Services Terms of Service Agreement',
        content: [
          'Eternal features YouTube integration powered by YouTube API Services. By connecting your YouTube account or viewing YouTube content on Eternal, you explicitly agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms).',
          'You acknowledge that your data will be accessed, processed, and stored in accordance with the Google Privacy Policy (https://policies.google.com/privacy).',
          'You may revoke Eternal’s access to your Google account at any time via the Google Security Settings permissions page at https://security.google.com/settings/security/permissions or by unlinking YouTube in Eternal Settings.',
        ],
        bullets: [
          'YouTube Terms of Service: https://www.youtube.com/t/terms',
          'Google Privacy Policy: https://policies.google.com/privacy',
          'Google Security Settings: https://security.google.com/settings/security/permissions',
        ],
      },
      {
        id: 'spotify-terms',
        title: '6.4 Spotify Terms of Service & Music Content Rights',
        content: [
          'Eternal connects with the Spotify Web API to enable music rich presence, display your favorite tracks and playlists, and allow audio preview streaming.',
          'All sound recordings, song titles, album artwork, and artist names are the proprietary content of Spotify AB or its licensors. You agree not to capture, rip, download, or record streaming audio provided through the Spotify integration.',
          'You can disconnect Spotify at any time in Eternal Settings, or revoke access via the Spotify Account Apps dashboard at https://www.spotify.com/account/apps/.',
        ],
        bullets: [
          'Spotify Terms of Service: https://www.spotify.com/legal/end-user-agreement/',
          'Spotify Privacy Policy: https://www.spotify.com/legal/privacy-policy/',
          'Spotify Account Apps (Revoke Access): https://www.spotify.com/account/apps/',
        ],
      },
      {
        id: 'twitch-terms',
        title: '6.5 Twitch Terms of Service & Streaming Data',
        content: [
          'Twitch live streaming presence and broadcaster statistics are powered by the official Twitch Helix API.',
          'By linking your Twitch account, you agree to the Twitch Terms of Service (https://www.twitch.tv/p/legal/terms-of-service/) and Twitch Privacy Notice (https://www.twitch.tv/p/legal/privacy-notice/).',
          'You may revoke Eternal’s authorization at any time in your Twitch Settings → Connections (https://www.twitch.tv/settings/connections) or by unlinking Twitch in your Eternal profile.',
        ],
        bullets: [
          'Twitch Terms of Service: https://www.twitch.tv/p/legal/terms-of-service/',
          'Twitch Privacy Notice: https://www.twitch.tv/p/legal/privacy-notice/',
          'Twitch Connection Settings: https://www.twitch.tv/settings/connections',
        ],
      },
      {
        id: 'steam-terms',
        title: '6.6 Valve Corporation / Steam Subscriber Agreement & Disclaimer',
        content: [
          'Steam integration is powered by Steam OpenID 2.0 and the Steam Web API to verify account ownership and display public game statistics and ranks.',
          'Steam and the Steam logo are trademarks and/or registered trademarks of Valve Corporation in the U.S. and/or other countries. Eternal is not affiliated with, endorsed by, or sponsored by Valve Corporation. Powered by Steam.',
          'Your use of Steam is subject to the Steam Subscriber Agreement (https://store.steampowered.com/subscriber_agreement/) and Valve Privacy Policy (https://store.steampowered.com/privacy_agreement/).',
        ],
        bullets: [
          'Steam Subscriber Agreement: https://store.steampowered.com/subscriber_agreement/',
          'Valve Privacy Policy: https://store.steampowered.com/privacy_agreement/',
        ],
      },
      {
        id: 'roblox-terms',
        title: '6.7 Roblox Terms of Use & Non-Affiliation Disclaimer',
        content: [
          'Roblox showcase features and ownership verification are enabled by official Roblox Web APIs and Roblox Open Cloud.',
          'Roblox, the Roblox logo, and Powering Imagination are among the registered and unregistered trademarks of Roblox Corporation in the U.S. and other countries. Eternal is not affiliated with, sponsored by, or endorsed by Roblox Corporation.',
          'Your use of Roblox data is subject to the Roblox Terms of Use (https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use) and Roblox Privacy Policy (https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy).',
        ],
        bullets: [
          'Roblox Terms of Use: https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use',
          'Roblox Privacy Policy: https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy',
        ],
      },
      {
        id: 'github-terms',
        title: '6.8 GitHub Terms of Service & Developer Guidelines',
        content: [
          'GitHub developer showcase cards are enabled by GitHub OAuth and the GitHub REST API.',
          'Connecting GitHub is governed by the GitHub Terms of Service (https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) and GitHub Privacy Statement (https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement). You can revoke access at https://github.com/settings/applications.',
        ],
        bullets: [
          'GitHub Terms of Service: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
          'GitHub Privacy Statement: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
        ],
      },
      {
        id: 'developer-bots-roadmap',
        title: '6.9 Custom Bots, Community Servers & Developer APIs',
        content: [
          'Users and developers may create automated bots and integrations using the Eternal Developer Portal. All bot integrations must be registered, keep API tokens confidential, follow rate limits, and comply with our dedicated Developer Terms of Service.',
        ],
      },
    ],
  },
  {
    id: 'copyright-dmca',
    number: '7',
    title: 'Copyright & Intellectual Property',
    iconName: 'FileText',
    tldr: 'We respect intellectual property rights. If you believe your copyright has been infringed on Eternal, you can submit a DMCA takedown notice.',
    subsections: [
      {
        id: 'dmca-notices',
        title: '7.1 DMCA & Copyright Infringement Notices',
        content: [
          'If you are a copyright owner or authorized agent and believe content hosted on Eternal infringes your copyright, you may submit a formal notification to copyright@eternal.app with details of the copyrighted work, URL location, and your contact info.',
          'We will respond promptly to valid notices and terminate the accounts of repeat infringers in appropriate circumstances.',
        ],
      },
    ],
  },
  {
    id: 'termination-and-appeals',
    number: '8',
    title: 'Termination & Appeals',
    iconName: 'KeyRound',
    tldr: 'You can delete your account at any time in 1 click. We may suspend accounts that violate our rules. You have the right to appeal any enforcement decision.',
    subsections: [
      {
        id: 'user-termination',
        title: '8.1 Your Right to Terminate',
        content: [
          'You may discontinue your use of Eternal and delete your account at any time via Settings → Security → Delete Account. Your content is hidden instantly, and permanently purged from backups within 30 days.',
        ],
      },
      {
        id: 'eternal-termination-appeals',
        title: '8.2 Account Suspension & Appeals',
        content: [
          'We may suspend or terminate accounts that repeatedly or severely violate these Terms or our Community Guidelines. If you believe a moderation action was taken in error, you can submit an appeal through our support portal or by emailing appeals@eternal.app.',
        ],
      },
    ],
  },
  {
    id: 'legal-disclaimers',
    number: '9',
    title: 'Legal Disclaimers & Dispute Resolution',
    iconName: 'ShieldCheck',
    tldr: 'Eternal is provided "as is". We encourage resolving disputes informally through good-faith communication before formal legal proceedings.',
    subsections: [
      {
        id: 'as-is-disclaimer',
        title: '9.1 Services Provided "AS IS"',
        content: [
          'To the maximum extent permitted by applicable law, Eternal and its services are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied.',
        ],
      },
      {
        id: 'dispute-resolution',
        title: '9.2 Informal Dispute Resolution',
        content: [
          'If you have a dispute with Eternal, you agree to first contact us at legal@eternal.app and attempt to resolve the issue informally and in good faith before initiating formal arbitration or court proceedings.',
        ],
      },
    ],
  },
  {
    id: 'contact-us',
    number: '10',
    title: 'Contact Us',
    iconName: 'Mail',
    tldr: 'If you have any questions regarding these Terms of Service or need legal assistance, our team is happy to help.',
    subsections: [
      {
        id: 'contact-details',
        title: '10.1 How to Contact Us',
        content: [
          'For legal and terms questions: legal@eternal.app',
          'For privacy and data protection: privacy@eternal.app',
          'For general support and feedback: support@eternal.app',
        ],
      },
    ],
  },
];

export const TERMS_SECTIONS_UK: TermsSection[] = [
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
          'Під назвою «Eternal», «ми», «нас» або «наш» маються на увазі засновники Ag Mykola та Ag Mihal, які керують проєктом Eternal в Україні.',
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
          'Ми надаємо вам персональну невиключну непередавану ліцензію на використання офіційних додатків Eternal виключно для доступу до сервісу. Копіювання, поширення, модифікація, зворотне проєктування чи декомпіляція нашого пропрієтарного ПЗ потребують письмового дозволу, крім випадків, дозволених застосовним законом або окремою ліцензією. Ця ліцензія не дозволяє використання пропрієтарного вихідного коду, самостійне розгортання або запуск окремого сервісу. Ліцензії сторонніх компонентів і чинні попередні дозволи зберігають силу.',
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

export const TERMS_HERO: Record<'en' | 'uk', LegalDocumentHero> = {
  en: {
    title: "ETERNAL'S TERMS OF SERVICE",
    effectiveDate: 'Effective Date: September 1, 2026 • Last Updated: August 28, 2026',
    description:
      'These Terms of Service set forth our mutual legal agreement when you use Eternal’s visual feeds, instant chats, voice rooms, and music streaming. We made them clear, transparent, and user-first.',
  },
  uk: {
    title: 'УМОВИ ВИКОРИСТАННЯ ETERNAL',
    effectiveDate:
      'Дата набрання чинності: 1 вересня 2026 р. • Останнє оновлення: 28 серпня 2026 р.',
    description:
      'Ці Умови використання регулюють використання стрічки публікацій, чатів, голосових кімнат та музики в Eternal. Ми зробили їх простими, прозорими та орієнтованими на користувача.',
  },
};
