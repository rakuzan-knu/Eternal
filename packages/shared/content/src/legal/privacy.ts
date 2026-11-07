import type { LegalDocumentHero } from './types';

export interface PrivacySubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface PrivacySection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: PrivacySubsection[];
}

export const PRIVACY_SECTIONS_EN: PrivacySection[] = [
  {
    id: 'welcome-and-basics',
    number: '1',
    title: 'Welcome to Eternal & The Basics',
    iconName: 'ShieldCheck',
    tldr: 'Eternal combines social feeds, private chats, voice rooms, and music features. Our minimum account age is 13, subject to higher local age limits and other applicable requirements. We do not sell your personal data.',
    subsections: [
      {
        id: 'our-mission',
        title: '1.1 What is Eternal & Our Core Privacy Promise',
        content: [
          'Eternal is a modern, unified social matrix designed for friends, creators, and communities. It combines visual social feeds with photos and stories, instant messaging with disappearing chats and channels, real-time voice and video hangout rooms, and interactive music playback with Spotify and SoundCloud.',
          'We follow a simple, transparent rule: we only collect what is strictly necessary to make Eternal work smoothly for you. We do not sell your personal information, posts, or private conversations to advertisers or third parties.',
        ],
        bullets: [
          'Zero data broker tracking: We never sell your personal profile data.',
          'Complete control: You decide who sees your posts, presence, and activity.',
          'Eternal is currently free to use. Paid subscriptions and creator payments are not available.',
        ],
      },
      {
        id: 'age-requirements',
        title: '1.2 Age Limits & Child Safety',
        content: [
          'The minimum account age is 13, subject to higher local account-age restrictions and other admission requirements. The age at which a child may consent to a particular use of personal data is a separate question. Required parental authorization and child-safety procedures cannot be replaced by accepting these Terms.',
          'Accounts below the applicable minimum age are prohibited. New registrations are currently closed pending regional admission and child-safety review. Report a suspected under-age account to eternalnet.support@proton.me. Required review and handling procedures are not yet complete.',
        ],
      },
      {
        id: 'who-we-are',
        title: '1.3 Who Runs Eternal',
        content: [
          'Eternal is jointly operated by Mykola Agh and Michal Agh, two individuals operating from Ukraine. They jointly determine the purposes and means of processing personal data for Eternal. Contact both operators at eternalnet.support@proton.me. Their respective responsibilities and applicable regional notices still need to be published.',
        ],
      },
    ],
  },
  {
    id: 'information-we-collect',
    number: '2',
    title: 'The Information We Collect',
    iconName: 'Database',
    tldr: 'We collect the information you choose to give us (account details, posts, messages), your live music track when connected, and technical data like session tokens and device metrics. We never record your voice calls.',
    subsections: [
      {
        id: 'account-information',
        title: '2.1 Information You Directly Provide to Us',
        content: ['When you create an account and use Eternal, you directly provide us with:'],
        bullets: [
          'Account Details: Username, display name, email address, password hash, and optional profile bio and birthday.',
          'Feed Posts & Media: Photos, videos, reels, stories, captions, comments, and reactions you publish.',
          'Direct & Group Chats: Messages, images, audio notes, attachments, and reactions sent in 1-on-1 or group conversations.',
          'Connected Music Services: If you connect Spotify or SoundCloud, we receive track metadata (song title, artist, album art) to display your current listening status. We never access your billing information, passwords, or payment cards.',
        ],
      },
      {
        id: 'voice-video-streaming',
        title: '2.2 Voice & Video Hangouts (Zero-Recording Guarantee)',
        content: [
          'Voice and video rooms are real-time audio and video sessions built on low-latency WebRTC streams.',
          'We do NOT record, listen to, or save your live voice or video conversations on our servers. When screen-sharing, only transient cover thumbnails may be processed temporarily to deliver the video stream to participants.',
        ],
      },
      {
        id: 'cookies-and-storage',
        title: '2.3 Cookies, Local Storage & Session Tokens (ePrivacy Compliance)',
        content: [
          'We use essential browser storage technologies to keep your session secure and your preferences saved:',
        ],
        bullets: [
          'Session Tokens & Auth Keys: Refresh tokens are stored in secure, encrypted, httpOnly cookies protected against XSS, while short-lived access tokens reside in memory during your active session.',
          'App Preferences: We save your chosen interface theme, volume levels, and language selection locally on your device.',
          'No Ad-Tracking Cookies: We do not use third-party tracking cookies to build advertising dossiers on your web browsing history.',
        ],
      },
      {
        id: 'technical-diagnostics',
        title: '2.4 Technical Information Collected Automatically',
        content: [
          'To ensure security, prevent spam bots, and diagnose errors, our servers automatically collect minimal technical metrics: IP address, operating system, browser type, connection latency, and crash diagnostic logs.',
        ],
      },
    ],
  },
  {
    id: 'how-we-use-information',
    number: '3',
    title: 'How We Use Your Information',
    iconName: 'Cpu',
    tldr: 'We use your data strictly to power the app, deliver your feeds and messages, enable voice hangouts, display music status, and keep the platform safe from bots and abuse.',
    subsections: [
      {
        id: 'service-delivery',
        title: '3.1 Providing & Operating Eternal',
        content: [
          'We use your data to deliver your social feed, sync chats in real time across your devices, connect your voice rooms, send push notifications, and sync "Listen Along" music playback with your friends.',
        ],
      },
      {
        id: 'safety-and-security',
        title: '3.2 Safety, Moderation & Anti-Abuse',
        content: [
          'We use automated detection systems and human moderation to keep Eternal a positive and safe community: blocking malware, preventing account takeovers, stopping automated spam bots, and enforcing our Community Guidelines against harassment.',
        ],
      },
    ],
  },
  {
    id: 'who-can-see-your-content',
    number: '4',
    title: 'Who Can See Your Profile & Content',
    iconName: 'Eye',
    tldr: 'You decide what is public and private. Private profiles hide your posts from strangers. You can toggle Ghost Mode or hide your music listening status at any time.',
    subsections: [
      {
        id: 'public-vs-private-profiles',
        title: '4.1 Public vs. Private Profiles',
        content: [
          'Public Profiles: Your feed posts, reels, and stories are visible to all users on Eternal and may appear in Explore recommendations.',
          'Private Profiles: Your posts and stories are strictly limited to followers you have personally approved.',
        ],
      },
      {
        id: 'presence-and-music-privacy',
        title: '4.2 Rich Presence & Music Privacy Controls (Ghost Mode)',
        content: [
          'When you connect Spotify or SoundCloud, your current song is displayed on your profile so friends can listen along.',
          'You have complete 1-click privacy control in Settings: you can enable Ghost Mode to hide your online presence, or toggle off "Share Music Activity" to keep your listening sessions completely private at any time.',
        ],
      },
      {
        id: 'chat-and-call-privacy',
        title: '4.3 Chat & Call Privacy Controls',
        content: [
          'You can control who can direct message you, who can start voice/video calls with you, block unwanted users, and enable disappearing messages that automatically delete after your chosen timer.',
        ],
      },
    ],
  },
  {
    id: 'data-retention-and-deletion',
    number: '5',
    title: 'How Long We Keep Data & How to Delete It',
    iconName: 'KeyRound',
    tldr: 'You can request access, correction, or deletion. Account deletion is permanent. Exact backup and media-purge periods have not yet been verified.',
    subsections: [
      {
        id: 'retention-periods',
        title: '5.1 Data Retention & Backup Purge Cycle',
        content: [
          'We keep your personal information only as long as your account remains active or as required by law:',
        ],
        bullets: [
          'Live Voice & Video: 0 seconds (streamed in real time, never recorded or stored).',
          'Disappearing Messages: Automatically erased from active servers once the countdown timer expires.',
          'Posts & Media: Stored until you edit or delete them.',
          'Account deletion: the current process permanently deletes your account from the active database after password verification. Community owners must transfer ownership first. There is no recovery grace period. Backup, media-storage, and other service purge procedures remain under review; a 30-day purge has not been verified.',
          'Security Records: Minimal security identifiers (such as ban hashes to prevent repeat bad actors) are retained strictly as necessary for fraud prevention and legal compliance.',
        ],
      },
      {
        id: 'your-rights-and-deletion',
        title: '5.2 Your Rights & 1-Click Account Deletion',
        content: [
          'Your rights depend on the law applicable to your situation. These may include access, correction, erasure, portability, objection, and a complaint to a competent supervisory authority. The download tool does not limit those rights:',
        ],
        bullets: [
          'Download your data: the self-service JSON download includes selected records and lists its exclusions. For other access or portability requests, contact eternalnet.support@proton.me.',
          'Edit Your Information: Update your username, email, password, or bio in Settings whenever you want.',
          '1-Click Account Deletion: Go to Settings → Security → Delete Account. Confirm with your password, and your deletion process begins immediately.',
          'We Never Sell Your Data: We do not sell, rent, or trade your personal data with third-party data brokers.',
        ],
      },
    ],
  },
  {
    id: 'third-party-integrations',
    number: '6',
    title: 'Third-Party Platform Integrations & API Developer Compliance',
    iconName: 'ShieldCheck',
    tldr: 'Third-party connections are optional. Permissions vary by provider and feature; Spotify permissions include library changes and playback control. Review the provider authorization screen before connecting, and revoke access in the provider account settings when needed.',
    subsections: [
      {
        id: 'third-party-overview',
        title: '6.1 Overview, User Consent & Zero Data-Broker Promise',
        content: [
          'Eternal offers optional third-party integrations to enrich your profile showcase with verified gaming ranks, streaming presence, repositories, and music playlists. Connecting any external service is completely voluntary.',
          'We adhere to a strict Zero Data-Broker standard: Eternal never sells, rents, monetizes, or transfers your third-party account data, credentials, or statistics to advertisers, data brokers, or any commercial third parties.',
          'You can disconnect a platform in Settings → Connected Accounts & Integrations. Also use the provider account settings to revoke provider-side permission. Full retention and cache-purge procedures remain under review; disconnecting does not establish that every historical copy has been erased.',
        ],
        bullets: [
          'Provider permissions: some integrations read profile and activity data; Spotify also requests permission to modify your library and control playback.',
          'Provider sign-in: OAuth or OpenID is used where supported. Some public-profile lookups do not use OAuth. Do not enter your provider password into Eternal.',
          'Disconnect in Eternal settings; revoke provider-side access separately in the provider account settings.',
        ],
      },
      {
        id: 'youtube-api-compliance',
        title: '6.2 YouTube API Services & Google User Data Policy Compliance',
        content: [
          'Eternal uses YouTube API Services to allow you to display verified channel statistics and recent video uploads on your profile showcase.',
          'By connecting your YouTube account or interacting with YouTube features on Eternal, you explicitly agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms).',
          'Eternal accesses, collects, and processes Google and YouTube user data strictly in accordance with the Google Privacy Policy (https://policies.google.com/privacy) and Google API Services User Data Policy, including the Limited Use requirements.',
          'Data Accessed & Displayed: When authorized, Eternal accesses your public YouTube channel details (channel title, handle, custom URL, avatar thumbnail), public channel statistics (subscriber count, total view count, video count), and up to 3 recent video uploads (video title, thumbnail URL, ISO duration, and video link).',
          'Data Storage & Security: We store only authorized channel identifiers and metadata in our secured database to render your profile card. We do not access or store private videos, comments, watch history, search history, Gmail, or Google Drive data.',
          'Revocation of Access: In addition to disconnecting YouTube via Eternal’s Profile Settings (which permanently deletes all stored channel metadata from our databases), you can revoke Eternal’s access to your Google account at any time through the Google Security Settings page at https://security.google.com/settings/security/permissions.',
        ],
        bullets: [
          'YouTube Terms of Service: https://www.youtube.com/t/terms',
          'Google Privacy Policy: https://policies.google.com/privacy',
          'Google Security Permissions (Revoke Access): https://security.google.com/settings/security/permissions',
        ],
      },
      {
        id: 'spotify-api-compliance',
        title: '6.3 Spotify Developer Policy & Web API Compliance',
        content: [
          'Eternal integrates with the official Spotify Web API to enable real-time music presence, track showcase cards, and audio preview playback.',
          'Spotify permissions include reading profile and playback information, top tracks, saved songs and playlists, modifying your music library, and controlling playback. Spotify presents the requested permissions during authorization. We do not receive your Spotify password or payment-card details through this authorization.',
          'Streaming & Audio Protection: Eternal does not store, rip, record, distribute, or permanently cache streaming audio files or music streams. All audio previews and playback controls communicate directly with official Spotify endpoints.',
          'Intellectual Property Notice: All song titles, artist names, album artwork, and audio content are the intellectual property of Spotify AB or their respective rights holders and licensors.',
          'Revocation of Access: You can disconnect Spotify at any time in Eternal Settings, which immediately deletes all stored Spotify access tokens and refresh tokens. You can also revoke access directly in your Spotify Account Apps page at https://www.spotify.com/account/apps/.',
        ],
        bullets: [
          'Spotify Privacy Policy: https://www.spotify.com/legal/privacy-policy/',
          'Spotify Account Apps (Revoke Access): https://www.spotify.com/account/apps/',
          'Ghost Mode: You can toggle off music sharing in Settings anytime without disconnecting.',
        ],
      },
      {
        id: 'twitch-api-compliance',
        title: '6.4 Twitch Developer Services Agreement (Helix API)',
        content: [
          'Eternal connects with the official Twitch Helix API to display your live streaming status, game category, live viewer count, and channel follower count.',
          'Real-Time Live Presence: When you broadcast on Twitch, Eternal automatically displays an authentic red LIVE badge with viewer count and stream title. When you are offline, an Offline indicator is displayed.',
          'Intellectual Property & Policies: Twitch channel assets, emotes, and broadcast streams belong to Twitch Interactive, Inc. or the respective broadcaster. By connecting Twitch, you agree to the Twitch Terms of Service (https://www.twitch.tv/p/legal/terms-of-service/) and Twitch Privacy Notice (https://www.twitch.tv/p/legal/privacy-notice/).',
          'Revocation of Access: You can disconnect Twitch at any time in Eternal Settings or revoke Eternal’s authorization in your Twitch Settings → Connections at https://www.twitch.tv/settings/connections.',
        ],
        bullets: [
          'Twitch Terms of Service: https://www.twitch.tv/p/legal/terms-of-service/',
          'Twitch Privacy Notice: https://www.twitch.tv/p/legal/privacy-notice/',
          'Twitch Connection Settings: https://www.twitch.tv/settings/connections',
        ],
      },
      {
        id: 'steam-api-compliance',
        title: '6.5 Steam (Valve Corporation) Web API & OpenID',
        content: [
          'Eternal utilizes Steam OpenID 2.0 and the Steam Web API to verify account ownership and display your public Steam gaming level, total games count, and competitive ranks (such as Dota 2 MMR and Counter-Strike 2 Premier Rating).',
          'Valve Trademark Disclaimer: Steam and the Steam logo are trademarks and/or registered trademarks of Valve Corporation in the U.S. and/or other countries. Eternal is not affiliated with, endorsed by, or sponsored by Valve Corporation. Powered by Steam.',
          'Security: Authentication occurs entirely on Steam’s official OpenID portal. Eternal never receives, handles, or stores your Steam password, credit card, or Steam Guard authentication codes.',
          'External Terms: Your use of Steam services is governed by the Steam Subscriber Agreement (https://store.steampowered.com/subscriber_agreement/) and Valve Privacy Policy (https://store.steampowered.com/privacy_agreement/).',
        ],
        bullets: [
          'Steam Subscriber Agreement: https://store.steampowered.com/subscriber_agreement/',
          'Valve Privacy Policy: https://store.steampowered.com/privacy_agreement/',
        ],
      },
      {
        id: 'roblox-api-compliance',
        title: '6.6 Roblox Open Cloud & Anti-Impersonation Verification',
        content: [
          'Eternal connects to official Roblox Web APIs and Roblox Open Cloud to showcase your 3D avatar bust thumbnail, friends count, followers count, 5 inventory collectibles, or top 5 favorite places.',
          'Anti-Impersonation Ownership Protocol: To ensure zero identity theft or false account claims, Eternal never uses insecure username inputs. Users must complete a cryptographic ownership verification challenge by temporarily placing an unguessable verification code into their Roblox profile "About" section, which our backend verifies directly against Roblox API servers before the connection is authorized.',
          'Roblox Trademark Disclaimer: Roblox, the Roblox logo, and Powering Imagination are among the registered and unregistered trademarks of Roblox Corporation in the U.S. and other countries. Eternal is not affiliated with, sponsored by, or endorsed by Roblox Corporation.',
          'External Terms: User data retrieved from Roblox is governed by the Roblox Terms of Use (https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use) and Roblox Privacy Policy (https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy).',
        ],
        bullets: [
          'Roblox Terms of Use: https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use',
          'Roblox Privacy Policy: https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy',
        ],
      },
      {
        id: 'github-api-compliance',
        title: '6.7 GitHub API Services & Developer Compliance',
        content: [
          'Eternal integrates with GitHub OAuth (read:user scope) and the GitHub REST API to display your public developer profile, public repositories count, star count, and pinned repository.',
          'External Terms: Connecting GitHub is subject to the GitHub Terms of Service (https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) and GitHub Privacy Statement (https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement).',
          'Revocation of Access: You can revoke Eternal’s OAuth access at any time through GitHub Settings → Applications → Authorized OAuth Apps at https://github.com/settings/applications.',
        ],
        bullets: [
          'GitHub Terms of Service: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
          'GitHub Privacy Statement: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
          'GitHub Authorized Apps: https://github.com/settings/applications',
        ],
      },
    ],
  },
  {
    id: 'contact-us',
    number: '7',
    title: 'Contact Us',
    iconName: 'Mail',
    tldr: 'Contact: eternalnet.support@proton.me. A DPO appointment has not been confirmed.',
    subsections: [
      {
        id: 'reach-out',
        title: '7.1 How to Contact Our Privacy Team',
        content: [
          'Contact: eternalnet.support@proton.me. Do not submit personal data through public issues.',
          'A DPO appointment has not been confirmed. Contact: eternalnet.support@proton.me. Do not submit personal data through public issues.',
          'Contact: eternalnet.support@proton.me. Do not submit personal data through public issues.',
        ],
      },
    ],
  },
];

export const PRIVACY_SECTIONS_UK: PrivacySection[] = [
  {
    id: 'welcome-and-basics',
    number: '1',
    title: 'Ласкаво просимо в Eternal та основи',
    iconName: 'ShieldCheck',
    tldr: 'Eternal поєднує стрічку, приватні чати, голосові кімнати та музичні функції. Мінімальний вік — 13 років з урахуванням вищих місцевих порогів та інших вимог. Ми не продаємо персональні дані.',
    subsections: [
      {
        id: 'our-mission',
        title: '1.1 Що таке Eternal та наша головна обіцянка конфіденційності',
        content: [
          'Eternal - це сучасна соціальна мережа для друзів, авторів та спільнот. Вона об’єднує візуальну стрічку з фото та історіями, месенджер зі зникаючими повідомленнями та каналами, голосові та відеокімнати в реальному часі, та спільне прослуховування музики зі Spotify та SoundCloud.',
          'Ми дотримуємося простого правила: збираємо лише те, що дійсно необхідно для роботи сервісу. Ми ніколи не продаємо ваші персональні дані, публікації або приватні листування третім особам чи рекламодавцям.',
        ],
        bullets: [
          'Жодного продажу даних: Ми не передаємо вашу інформацію рекламним брокерам.',
          'Повний контроль: Ви самі вирішуєте, хто бачить ваш контент, статус та активність.',
          'Eternal наразі безкоштовний. Платні підписки та платежі авторам недоступні.',
        ],
      },
      {
        id: 'age-requirements',
        title: '1.2 Вікові обмеження та захист дітей',
        content: [
          'Мінімальний вік для облікового запису — 13 років із вищими місцевими порогами та іншими умовами допуску. Вік самостійної згоди дитини на певну обробку даних є окремим питанням. Прийняття умов не замінює необхідної батьківської згоди та процедур захисту дітей.',
          'Облікові записи осіб молодших за застосовний мінімальний вік заборонені. Нові реєстрації закриті до перевірки регіонального допуску й захисту дітей. Про можливий обліковий запис дитини молодшого віку повідомляйте на eternalnet.support@proton.me; необхідні процедури перевірки й реагування ще не завершено.',
        ],
      },
      {
        id: 'who-we-are',
        title: '1.3 Хто керує Eternal',
        content: [
          'Eternal спільно керують Mykola Agh та Michal Agh — дві фізичні особи, які ведуть діяльність з України. Вони спільно визначають цілі та способи обробки персональних даних у Eternal. Зв’язатися з обома операторами можна за адресою eternalnet.support@proton.me. Розподіл їхніх обов’язків і відповідні регіональні повідомлення ще потрібно опублікувати.',
        ],
      },
    ],
  },
  {
    id: 'information-we-collect',
    number: '2',
    title: 'Інформація, яку ми збираємо',
    iconName: 'Database',
    tldr: 'Ми збираємо дані, які ви надаєте (профіль, дописи, повідомлення), поточний музичний трек при підключенні та технічні дані (токени сесії, діагностика). Ми ніколи не записуємо дзвінки.',
    subsections: [
      {
        id: 'account-information',
        title: '2.1 Інформація, яку ви надаєте безпосередньо',
        content: ['Створюючи профіль та користуючись Eternal, ви надаєте нам:'],
        bullets: [
          'Дані профілю: Ім’я користувача, відображуване ім’я, email, хеш пароля, опис біо та дату народження.',
          'Публікації та медіа: Фотографії, відео, рілси, історії, підписи, коментарі та реакції.',
          'Особисті та групові чати: Текстові повідомлення, фото, голосові нотатки, вкладення та реакції.',
          'Музичні сервіси: При підключенні Spotify або SoundCloud ми отримуємо лише назву треку, виконавця та обкладинку для статусу. Ми не маємо доступу до платіжних карток чи паролів.',
        ],
      },
      {
        id: 'voice-video-streaming',
        title: '2.2 Голосові та відеокімнати (Гарантія без запису)',
        content: [
          'Голосові та відеокімнати транслюються наживо через WebRTC з мінімальною затримкою.',
          'Ми НЕ записуємо, не прослуховуємо і не зберігаємо ваші розмови на серверах. При демонстрації екрана обробляються лише тимчасові кадри трансляції для передачі учасникам кімнати.',
        ],
      },
      {
        id: 'cookies-and-storage',
        title: '2.3 Файли cookie, Local Storage та токени сесії (ePrivacy)',
        content: [
          'Ми використовуємо необхідні технології збереження для авторизації та налаштувань:',
        ],
        bullets: [
          'Токени сесії: Токени оновлення зберігаються у захищених файлах cookie httpOnly із захистом від XSS, а короткоживучі токени доступу — в пам’яті активної сесії.',
          'Налаштування додатка: Зберігають обрану тему, гучність та вибір мови локально на пристрої.',
          'Без рекламних трекерів: Ми не використовуємо сторонні шпигунські cookie для відстеження вашої активності в інтернеті.',
        ],
      },
      {
        id: 'technical-diagnostics',
        title: '2.4 Автоматичні технічні дані',
        content: [
          'Для захисту від ботів і стабільної роботи сервери автоматично фіксують мінімальні дані: IP-адресу, ОС, браузер, швидкість з’єднання та системні логи збоїв.',
        ],
      },
    ],
  },
  {
    id: 'how-we-use-information',
    number: '3',
    title: 'Як ми використовуємо вашу інформацію',
    iconName: 'Cpu',
    tldr: 'Ми використовуємо дані виключно для роботи сервісу, синхронізації чатів, голосових кімнат, статусу музики та захисту спільноти від спаму й шахрайства.',
    subsections: [
      {
        id: 'service-delivery',
        title: '3.1 Забезпечення роботи Eternal',
        content: [
          'Ми використовуємо дані для показу стрічки, миттєвої доставки повідомлень, голосового зв’язку, надсилання сповіщень та спільного прослуховування музики.',
        ],
      },
      {
        id: 'safety-and-security',
        title: '3.2 Безпека та захист від зловживань',
        content: [
          'Ми застосовуємо автоматичні фільтри та модерацію для захисту спільноти від спаму, шахрайства, шкідливого ПЗ та ботів згідно з Правилами спільноти.',
        ],
      },
    ],
  },
  {
    id: 'who-can-see-your-content',
    number: '4',
    title: 'Хто може бачити ваш профіль і контент',
    iconName: 'Eye',
    tldr: 'Ви повністю керуєте приватністю. Закриті профілі бачать лише схвалені підписники. Статус музики та активність можна вимкнути в 1 клік (Ghost Mode).',
    subsections: [
      {
        id: 'public-vs-private-profiles',
        title: '4.1 Публічні та приватні профілі',
        content: [
          'Публічні акаунти: Ваші публікації та історії доступні всім користувачам Eternal.',
          'Приватні акаунти: Лише схвалені вами підписники можуть переглядати ваш контент.',
        ],
      },
      {
        id: 'presence-and-music-privacy',
        title: '4.2 Статус активності та приватність музики (Ghost Mode)',
        content: [
          'При підключенні Spotify або SoundCloud трек відображається у вашому профілі для друзів.',
          'У Налаштуваннях ви можете в 1 клік увімкнути Режим невидимки (Ghost Mode), щоб приховати онлайн-статус, або вимкнути показ музики в будь-який момент.',
        ],
      },
      {
        id: 'chat-and-call-privacy',
        title: '4.3 Приватність чатів та дзвінків',
        content: [
          'Ви можете обмежити, хто може телефонувати вам чи надсилати повідомлення, блокувати небажаних користувачів та встановлювати автовидалення повідомлень за таймером.',
        ],
      },
    ],
  },
  {
    id: 'data-retention-and-deletion',
    number: '5',
    title: 'Зберігання та видалення ваших даних',
    iconName: 'KeyRound',
    tldr: 'Ви можете запросити доступ, виправлення чи видалення. Видалення облікового запису постійне. Точні строки очищення резервних копій і медіа ще не перевірено.',
    subsections: [
      {
        id: 'retention-periods',
        title: '5.1 Терміни зберігання та цикл очищення бекапів',
        content: ['Ми зберігаємо інформацію лише доти, доки ваш обліковий запис активний:'],
        bullets: [
          'Голосові та відеодзвінки: 0 секунд (передаються наживо, не зберігаються).',
          'Зникаючі повідомлення: Автоматично видаляються з серверів після завершення таймера.',
          'Контент і медіа: Зберігаються до моменту, поки ви самі їх не видалите.',
          'Видалення облікового запису: поточна процедура після перевірки пароля постійно видаляє обліковий запис з активної бази даних. Власникам спільнот спершу потрібно передати права власності. Пільгового періоду відновлення немає. Очищення резервних копій, медіасховищ та інших сервісів ще перевіряється; строк 30 днів не підтверджено.',
          'Безпека: Мінімальні технічні ідентифікатори порушників зберігаються лише з метою запобігання повторному шахрайству згідно із законом.',
        ],
      },
      {
        id: 'your-rights-and-deletion',
        title: '5.2 Ваші права та видалення в 1 клік',
        content: ['Відповідно до міжнародних стандартів конфіденційності, ви маєте чіткі права:'],
        bullets: [
          'Завантажити дані: Ви можете експортувати всі свої пости та повідомлення будь-коли.',
          'Редагувати профіль: Оновлюйте email, ім’я та дані в будь-який момент.',
          'Видалити акаунт в 1 клік: Налаштування → Безпека → Видалити акаунт. Введіть пароль для підтвердження, і процес видалення почнеться негайно.',
          'Жодного продажу даних: Ми не продаємо і не передаємо персональні дані посередникам.',
        ],
      },
    ],
  },
  {
    id: 'third-party-integrations',
    number: '6',
    title: 'Інтеграції сторонніх платформ та відповідність політикам API розробників',
    iconName: 'ShieldCheck',
    tldr: 'Підключення сторонніх платформ є добровільним. Дозволи залежать від провайдера та функції; Spotify також запитує зміну бібліотеки й керування відтворенням. Перегляньте дозволи на сторінці авторизації та за потреби відкличте доступ у налаштуваннях провайдера.',
    subsections: [
      {
        id: 'third-party-overview',
        title: '6.1 Загальні положення, згода користувача та відсутність продажу даних',
        content: [
          'Eternal надає користувачам можливість підключати сторонні платформи для відображення підтверджених ігрових рангів, стрімів, репозиторіїв та музичних плейлистів у профілі. Підключення є виключно добровільним.',
          'Ми ніколи не продаємо, не здаємо в оренду та не передаємо ваші облікові дані, токени чи статистику брокерам даних або рекламодавцям.',
          'Ви можете відв’язати платформу в Налаштуваннях → Підключені акаунти. Дозвіл на стороні провайдера також можна відкликати в його налаштуваннях. Повні процедури зберігання й очищення кешів ще перевіряються; відв’язання не підтверджує видалення всіх історичних копій.',
        ],
        bullets: [
          'Дозволи провайдерів: частина інтеграцій читає профіль і активність; Spotify також запитує зміну бібліотеки й керування відтворенням.',
          'Вхід провайдера: OAuth або OpenID використовується там, де підтримується. Частина пошуків публічних профілів не використовує OAuth. Не вводьте пароль провайдера в Eternal.',
          'Відв’язуйте платформу в Eternal; доступ на стороні провайдера відкликайте окремо в його налаштуваннях.',
        ],
      },
      {
        id: 'youtube-api-compliance',
        title: '6.2 YouTube API Services та відповідність правилам Google User Data Policy',
        content: [
          'Eternal використовує YouTube API Services для відображення підтвердженої статистики вашого каналу та останніх завантажених відео у профілі.',
          'Підключаючи свій YouTube канал або використовуючи функції YouTube в Eternal, ви погоджуєтеся дотримуватися Умов використання YouTube (YouTube Terms of Service: https://www.youtube.com/t/terms).',
          'Eternal отримує та обробляє дані користувачів Google та YouTube суворо відповідно до Політики конфіденційності Google (Google Privacy Policy: https://policies.google.com/privacy) та правил Google API Services User Data Policy.',
          'Дані, що збираються та відображаються: назва каналу, нікнейм, аватар, кількість підписників, загальна кількість переглядів, кількість відео та до 3 останніх публічних відео (назва, прев’ю, тривалість, посилання).',
          'Відкликання доступу: Окрім відв’язання в налаштуваннях Eternal (що повністю видаляє всі збережені дані каналу з нашої бази), ви можете в будь-який момент відкликати доступ додатку Eternal до вашого Google акаунта на сторінці безпеки Google: https://security.google.com/settings/security/permissions.',
        ],
        bullets: [
          'Умови використання YouTube: https://www.youtube.com/t/terms',
          'Політика конфіденційності Google: https://policies.google.com/privacy',
          'Сторінка налаштувань безпеки Google (відкликання доступу): https://security.google.com/settings/security/permissions',
        ],
      },
      {
        id: 'spotify-api-compliance',
        title: '6.3 Spotify Developer Policy та використання Spotify Web API',
        content: [
          'Eternal інтегрований з офіційним Spotify Web API для відображення музичного статусу, карток улюблених треків і плейлистів та прослуховування прев’ю.',
          'Дозволи Spotify охоплюють читання профілю, стану відтворення, улюблених треків, бібліотеки й плейлистів, а також зміну музичної бібліотеки та керування відтворенням. Spotify показує запитані дозволи під час авторизації. Через цю авторизацію ми не отримуємо ваш пароль Spotify чи дані платіжної картки.',
          'Eternal не зберігає, не записує і не копіює аудіофайли чи аудіопотоки на свої сервери.',
          'Усі назви треків, імена виконавців та обкладинки є інтелектуальною власністю Spotify AB або відповідних правовласників.',
          'Ви можете відв’язати Spotify у налаштуваннях або відкликати доступ на сторінці додатків Spotify: https://www.spotify.com/account/apps/.',
        ],
        bullets: [
          'Політика конфіденційності Spotify: https://www.spotify.com/legal/privacy-policy/',
          'Керування додатками Spotify (відкликання доступу): https://www.spotify.com/account/apps/',
        ],
      },
      {
        id: 'twitch-api-compliance',
        title: '6.4 Twitch Developer Services Agreement (Helix API)',
        content: [
          'Eternal взаємодіє з офіційним Twitch Helix API для відображення статусу прямої трансляції, категорії гри, кількості глядачів та підписників каналу.',
          'Під час трансляції у профілі автоматично з’являється статус LIVE із назвою стриму та кількістю глядачів. Коли стрім завершено, відображається статус Offline.',
          'Підключення Twitch регулюється Умовами використання Twitch (https://www.twitch.tv/p/legal/terms-of-service/) та Політикою конфіденційності Twitch (https://www.twitch.tv/p/legal/privacy-notice/).',
          'Відкликати доступ можна в налаштуваннях Eternal або безпосередньо у Twitch: https://www.twitch.tv/settings/connections.',
        ],
        bullets: [
          'Умови використання Twitch: https://www.twitch.tv/p/legal/terms-of-service/',
          'Політика конфіденційності Twitch: https://www.twitch.tv/p/legal/privacy-notice/',
          'Налаштування підключень Twitch: https://www.twitch.tv/settings/connections',
        ],
      },
      {
        id: 'steam-api-compliance',
        title: '6.5 Steam (Valve Corporation) Web API та OpenID',
        content: [
          'Eternal використовує Steam OpenID 2.0 та Steam Web API для підтвердження володіння акаунтом та відображення публічного ігрового профілю Steam, рівня, кількості ігор та рангів у Dota 2 та CS2.',
          'Steam та логотип Steam є торговельними марками Valve Corporation. Eternal не пов’язаний з Valve Corporation та не спонсорується нею. Powered by Steam.',
          'Eternal ніколи не отримує і не зберігає ваш пароль від Steam чи коди Steam Guard.',
          'Використання регулюється Угодою передплатника Steam (https://store.steampowered.com/subscriber_agreement/) та Політикою конфіденційності Valve (https://store.steampowered.com/privacy_agreement/).',
        ],
        bullets: [
          'Угода передплатника Steam: https://store.steampowered.com/subscriber_agreement/',
          'Політика конфіденційності Valve: https://store.steampowered.com/privacy_agreement/',
        ],
      },
      {
        id: 'roblox-api-compliance',
        title: '6.6 Roblox Open Cloud та верифікація володіння акаунтом',
        content: [
          'Eternal підключається до офіційних API Roblox та Roblox Open Cloud для показу 3D-аватара, кількості друзів, фолловерів, 5 предметів або 5 улюблених місць.',
          'Для запобігання видачі себе за іншу особу в Eternal впроваджено обов’язкову криптографічну перевірку володіння: користувач розміщує унікальний код у розділі «About» на roblox.com, який сервер перевіряє напряму перед прив’язкою.',
          'Roblox є зареєстрованою торговельною маркою Roblox Corporation. Eternal не є афілійованим із Roblox Corporation.',
          'Використання регулюється Умовами використання Roblox (https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use) та Політикою конфіденційності Roblox (https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy).',
        ],
        bullets: [
          'Умови використання Roblox: https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use',
          'Політика конфіденційності Roblox: https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy',
        ],
      },
      {
        id: 'github-api-compliance',
        title: '6.7 GitHub API Services та відповідність політикам розробників',
        content: [
          'Eternal взаємодіє з GitHub OAuth (scope read:user) та GitHub REST API для показу публічного профілю розробника, репозиторіїв та зірок.',
          'Підключення регулюється Умовами надання послуг GitHub (https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) та Заявою про конфіденційність GitHub (https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement).',
          'Ви можете відкликати доступ додатку в налаштуваннях GitHub: https://github.com/settings/applications.',
        ],
        bullets: [
          'Умови використання GitHub: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
          'Політика конфіденційності GitHub: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
          'Авторизовані додатки GitHub: https://github.com/settings/applications',
        ],
      },
    ],
  },
  {
    id: 'contact-us',
    number: '7',
    title: 'Зв’язатися з нами',
    iconName: 'Mail',
    tldr: 'Якщо у вас виникли запитання щодо конфіденційності чи потрібна допомога з даними, наша команда завжди готова допомогти.',
    subsections: [
      {
        id: 'reach-out',
        title: '7.1 Як зв’язатися з відділом конфіденційності',
        content: [
          'Контакт: eternalnet.support@proton.me. Не надсилайте персональні дані через публічні звернення.',
          'Призначення DPO не підтверджено. Контакт: eternalnet.support@proton.me. Не надсилайте персональні дані через публічні звернення.',
          'Контакт: eternalnet.support@proton.me. Не надсилайте персональні дані через публічні звернення.',
        ],
      },
    ],
  },
];

export const PRIVACY_HERO: Record<'en' | 'uk', LegalDocumentHero> = {
  en: {
    title: 'ETERNAL PRIVACY POLICY',
    effectiveDate: 'Updated: November 5, 2026',
    description:
      'We built Eternal with transparency, security, and user control at the forefront. This policy outlines how your feeds, messages, voice channels, and music integrations are handled, and how you remain in complete control of your data.',
  },
  uk: {
    title: 'ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ ETERNAL',
    effectiveDate: 'Оновлено: 5 листопада 2026 р.',
    description:
      'Ми створили Eternal із турботою про прозорість, безпеку та повний контроль даних. Тут зрозумілою мовою описано, як обробляються ваші публікації, чати, голосові канали та музика, а також як ви зберігаєте повний контроль над своєю інформацією.',
  },
};
