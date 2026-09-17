import { SupportedLanguage } from '@/shared/lib/language/languageStore';

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

export interface LegalUITranslation {
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
    hubsTitle: string;
    collectionsTitle: string;
    learnTitle: string;
    buildTitle: string;
    familyCenter: string;
    safetyLibrary: string;
    safetyNews: string;
    teenCharter: string;
    playersGuide: string;
    securityBulletins: string;
    teenSafety: string;
    voiceRoomGuidelines: string;
    parentHub: string;
    policyHub: string;
    privacyHub: string;
    transparencyHub: string;
    wellbeingHub: string;
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
  footer: {
    language: string;
    social: string;
    columns: {
      product: string;
      download: string;
      feedDiscover: string;
      voiceVideo: string;
      messenger: string;
      musicHub: string;
      status: string;
      company: string;
      about: string;
      jobs: string;
      brand: string;
      newsroom: string;
      resources: string;
      support: string;
      safety: string;
      blog: string;
      creators: string;
      community: string;
      developers: string;
      feedback: string;
      policies: string;
      terms: string;
      privacy: string;
      cookieSettings: string;
      guidelines: string;
      acknowledgements: string;
      licenses: string;
      companyInfo: string;
    };
  };
  sections: PrivacySection[];
}

// 1. English (Default) - Complete & Legally Sound
const EN_UI: LegalUITranslation = {
  navbar: {
    product: 'Product',
    safety: 'Safety',
    support: 'Support',
    blog: 'Blog',
    developers: 'Developers',
    careers: 'Careers',
    openEternal: 'Open Eternal',
    infoTitle: 'Information',
    centersTitle: 'Centers',
    resourcesTitle: 'Resources',
    hubsTitle: 'Hubs',
    collectionsTitle: 'Collections',
    learnTitle: 'Learn',
    buildTitle: 'Build',
    familyCenter: 'Family Center',
    safetyLibrary: 'Safety Library',
    safetyNews: 'Safety News',
    teenCharter: 'Teen Charter',
    playersGuide: "Eternal Player's Guide",
    securityBulletins: 'Security Bulletins',
    teenSafety: 'Teen Safety Charter',
    voiceRoomGuidelines: 'Voice Room Guidelines',
    parentHub: 'Parent Hub',
    policyHub: 'Policy Hub',
    privacyHub: 'Privacy Hub',
    transparencyHub: 'Transparency Hub',
    wellbeingHub: 'Wellbeing Hub',
    policyEnforcement: 'Policy Enforcement',
    privacyPolicyActive: 'Privacy Policy (Active)',
    transparencyReports: 'Transparency Reports',
    helpCenter: 'Help Center',
    feedback: 'Feedback',
    submitRequest: 'Submit a Request',
    featured: 'Featured',
    community: 'Community',
    eternalHq: 'Eternal HQ',
    engineering: 'Engineering & Developers',
    howToEternal: 'How to Eternal',
    policySafety: 'Policy & Safety',
    productFeatures: 'Product & Features',
    eternalForDevs: 'Eternal for Developers',
    integration: 'Integration',
    socialCommerce: 'Social Commerce',
    appsActivities: 'Apps & Activities',
    devNewsletter: 'Developer Newsletter',
    devCaseStudies: 'Developer Case Studies',
    officialCommunities: 'Official Game Communities',
    devPortal: 'Developer Portal',
    documentation: 'Documentation',
    devHelpCenter: 'Developer Help Center',
  },
  hero: {
    title: 'ETERNAL PRIVACY POLICY',
    effectiveDate: 'Effective Date: September 1, 2026 • Last Updated: August 28, 2026',
    description:
      'We built Eternal with transparency, security, and user control at the forefront. This policy outlines how your feeds, messages, voice channels, and music integrations are handled, and how you remain in complete control of your data.',
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
  footer: {
    language: 'Language',
    social: 'Social',
    columns: {
      product: 'Product',
      download: 'Download',
      feedDiscover: 'Feed & Discover',
      voiceVideo: 'Voice & Video',
      messenger: 'Messenger',
      musicHub: 'Music Hub',
      status: 'Status',
      company: 'Company',
      about: 'About',
      jobs: 'Jobs',
      brand: 'Brand',
      newsroom: 'Newsroom',
      resources: 'Resources',
      support: 'Support',
      safety: 'Safety',
      blog: 'Blog',
      creators: 'Creators',
      community: 'Community',
      developers: 'Developers',
      feedback: 'Feedback',
      policies: 'Policies',
      terms: 'Terms',
      privacy: 'Privacy',
      cookieSettings: 'Cookie Settings',
      guidelines: 'Guidelines',
      acknowledgements: 'Acknowledgements',
      licenses: 'Licenses',
      companyInfo: 'Company Information',
    },
  },
  sections: [
    {
      id: 'welcome-and-basics',
      number: '1',
      title: 'Welcome to Eternal & The Basics',
      iconName: 'ShieldCheck',
      tldr: 'Eternal combines social feeds, private chats, voice hangouts, and music streaming into one unified platform. We never sell your personal data and enforce strict 13+ (or 16+ in the EU) age requirements.',
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
            'Funded by premium subscriptions and creator features - never by selling private chats.',
          ],
        },
        {
          id: 'age-requirements',
          title: '1.2 Age Limits & Child Safety',
          content: [
            'You must be at least 13 years old to create an account and use Eternal. If the law in your country requires you to be older to consent to online services without parental permission (such as 16 in certain European Union countries), you must meet that higher age requirement.',
            'We do not knowingly collect personal data from anyone under the minimum age. If we learn that a user is under the required age limit, we will immediately close the account and remove their personal information from our active databases.',
          ],
        },
        {
          id: 'who-we-are',
          title: '1.3 Who Runs Eternal',
          content: [
            'Eternal is operated by Eternal Inc. When you use our services, we act as the data controller of your account information under applicable global privacy regulations.',
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
            'Session Tokens & Auth Keys: Stored securely in your browser’s localStorage to keep you logged in across devices and protect against unauthorized access.',
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
      tldr: 'You own your data. When you delete your account or posts, they are hidden instantly. Full erasure from backup archives takes up to 30 days.',
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
            'Account Deletion & Backup Purge: When you request account deletion, your profile, posts, and messages become immediately invisible to all users. Complete, permanent erasure across all active databases and cycling out of encrypted disaster-recovery backups is completed within up to 30 days.',
            'Security Records: Minimal security identifiers (such as ban hashes to prevent repeat bad actors) are retained strictly as necessary for fraud prevention and legal compliance.',
          ],
        },
        {
          id: 'your-rights-and-deletion',
          title: '5.2 Your Rights & 1-Click Account Deletion',
          content: [
            'Under privacy laws worldwide (including GDPR in Europe and CCPA in California), you have clear, guaranteed rights:',
          ],
          bullets: [
            'Download Your Data: You can request a complete export of your posts, messages, and profile info anytime.',
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
      tldr: 'We provide optional integrations with YouTube, Spotify, Twitch, Steam, Roblox, and GitHub. We strictly adhere to each provider’s developer policies, never sell your data, request only minimal read-only permissions, and give you 1-click unlinking and complete revocation options.',
      subsections: [
        {
          id: 'third-party-overview',
          title: '6.1 Overview, User Consent & Zero Data-Broker Promise',
          content: [
            'Eternal offers optional third-party integrations to enrich your profile showcase with verified gaming ranks, streaming presence, repositories, and music playlists. Connecting any external service is completely voluntary.',
            'We adhere to a strict Zero Data-Broker standard: Eternal never sells, rents, monetizes, or transfers your third-party account data, credentials, or statistics to advertisers, data brokers, or any commercial third parties.',
            'You retain full control over your connections at all times. You can disconnect any platform with one click in Settings → Connected Accounts & Integrations, which immediately purges all associated tokens and cached showcase data from our databases and Redis cache.',
          ],
          bullets: [
            'Strictly Read-Only Access: We only request public profile statistics, activity presence, and ranks.',
            'No Password Storage: All authentication flows operate through official OAuth 2.0 or OpenID protocols.',
            'Instant 1-Click Revocation: Unlinking in your profile permanently deletes stored tokens and cached data.',
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
            'Authorized Scopes: When linking Spotify, we request permission to read your public profile, current playback state, top tracks, liked songs, and playlists. We never access your billing details, credit cards, or Spotify account passwords.',
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
      tldr: 'If you ever have a question about your privacy, need help with your data, or want to speak with our Data Protection Officer, we are here to help.',
      subsections: [
        {
          id: 'reach-out',
          title: '7.1 How to Contact Our Privacy Team',
          content: [
            'Email us at privacy@eternal.app with any questions about this Privacy Policy or how we process your information. We will be happy to help.',
            'To contact Eternal’s Data Protection Officer, please email dpo@eternal.app.',
            'For security vulnerability disclosures or bug bounty reports, email security@eternal.app.',
          ],
        },
      ],
    },
  ],
};

// 2. Ukrainian (Українська) - 100% Comprehensive Translation
const UK_UI: LegalUITranslation = {
  navbar: {
    product: 'Продукт',
    safety: 'Безпека',
    support: 'Підтримка',
    blog: 'Блог',
    developers: 'Розробникам',
    careers: 'Кар’єра',
    openEternal: 'Відкрити Eternal',
    infoTitle: 'Інформація',
    centersTitle: 'Центри',
    resourcesTitle: 'Ресурси',
    hubsTitle: 'Хаби',
    collectionsTitle: 'Колекції',
    learnTitle: 'Навчання',
    buildTitle: 'Створення',
    familyCenter: 'Сімейний центр',
    safetyLibrary: 'Бібліотека безпеки',
    safetyNews: 'Новини безпеки',
    teenCharter: 'Хартія підлітків',
    playersGuide: 'Посібник гравця Eternal',
    securityBulletins: 'Бюлетені безпеки',
    teenSafety: 'Хартія безпеки підлітків',
    voiceRoomGuidelines: 'Правила голосових кімнат',
    parentHub: 'Хаб для батьків',
    policyHub: 'Хаб політики та правил',
    privacyHub: 'Хаб приватності',
    transparencyHub: 'Хаб прозорості',
    wellbeingHub: 'Хаб добробуту',
    policyEnforcement: 'Застосування правил',
    privacyPolicyActive: 'Політика конфіденційності (Активна)',
    transparencyReports: 'Звіти про прозорість',
    helpCenter: 'Довідковий центр',
    feedback: 'Відгуки та ідеї',
    submitRequest: 'Надіслати запит',
    featured: 'Вибране',
    community: 'Спільнота',
    eternalHq: 'Штаб-квартира Eternal',
    engineering: 'Інженерія та розробка',
    howToEternal: 'Як користуватися Eternal',
    policySafety: 'Правила та безпека',
    productFeatures: 'Продукт і можливості',
    eternalForDevs: 'Eternal для розробників',
    integration: 'Інтеграція',
    socialCommerce: 'Соціальна комерція',
    appsActivities: 'Додатки та активності',
    devNewsletter: 'Розсилка для розробників',
    devCaseStudies: 'Кейси розробників',
    officialCommunities: 'Офіційні ігрові спільноти',
    devPortal: 'Портал розробників',
    documentation: 'Документація',
    devHelpCenter: 'Довідковий центр розробника',
  },
  hero: {
    title: 'ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ ETERNAL',
    effectiveDate:
      'Дата набрання чинності: 1 вересня 2026 р. • Останнє оновлення: 28 серпня 2026 р.',
    description:
      'Ми створили Eternal із турботою про прозорість, безпеку та повний контроль даних. Тут зрозумілою мовою описано, як обробляються ваші публікації, чати, голосові канали та музика, а також як ви зберігаєте повний контроль над своєю інформацією.',
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
  footer: {
    language: 'Мова',
    social: 'Соцмережі',
    columns: {
      product: 'Продукт',
      download: 'Завантажити',
      feedDiscover: 'Стрічка та огляд',
      voiceVideo: 'Голос і відео',
      messenger: 'Месенджер',
      musicHub: 'Музика',
      status: 'Статус системи',
      company: 'Компанія',
      about: 'Про нас',
      jobs: 'Вакансії',
      brand: 'Бренд',
      newsroom: 'Новини',
      resources: 'Ресурси',
      support: 'Підтримка',
      safety: 'Безпека',
      blog: 'Блог',
      creators: 'Автори',
      community: 'Спільнота',
      developers: 'Розробники',
      feedback: 'Зворотний зв’язок',
      policies: 'Правила',
      terms: 'Умови',
      privacy: 'Конфіденційність',
      cookieSettings: 'Налаштування cookie',
      guidelines: 'Правила спільноти',
      acknowledgements: 'Подяки',
      licenses: 'Ліцензії',
      companyInfo: 'Інформація про компанію',
    },
  },
  sections: [
    {
      id: 'welcome-and-basics',
      number: '1',
      title: 'Ласкаво просимо в Eternal та основи',
      iconName: 'ShieldCheck',
      tldr: 'Eternal поєднує стрічку публікацій, приватні чати, голосові кімнати та прослуховування музики в єдину платформу. Ми ніколи не продаємо ваші дані та дотримуємося вікового цензу 13+ (або 16+ у ЄС).',
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
            'Фінансування за рахунок преміум-підписок та функцій для авторів, а не продажу листування.',
          ],
        },
        {
          id: 'age-requirements',
          title: '1.2 Вікові обмеження та захист дітей',
          content: [
            'Вам має бути не менше 13 років для створення облікового запису та використання Eternal. Якщо законодавство вашої країни встановлює вищий віковий ценз (наприклад, 16 років у деяких країнах ЄС), ви повинні відповідати цим вимогам.',
            'Ми свідомо не збираємо дані осіб, молодших за встановлений вік. У разі виявлення такого акаунта він негайно закривається, а персональні дані видаляються з активних систем.',
          ],
        },
        {
          id: 'who-we-are',
          title: '1.3 Хто керує Eternal',
          content: [
            'Eternal управляється компанією Eternal Inc. Ми виступаємо розпорядником даних вашого облікового запису відповідно до міжнародного законодавства про захист персональних даних.',
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
            'Токени сесії: Зберігаються в localStorage браузера для швидкого входу та захисту від несанкціонованого доступу.',
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
      tldr: 'Ви володієте своїми даними. При видаленні акаунта він приховується миттєво. Повне очищення з резервних копій займає до 30 днів.',
      subsections: [
        {
          id: 'retention-periods',
          title: '5.1 Терміни зберігання та цикл очищення бекапів',
          content: ['Ми зберігаємо інформацію лише доти, доки ваш обліковий запис активний:'],
          bullets: [
            'Голосові та відеодзвінки: 0 секунд (передаються наживо, не зберігаються).',
            'Зникаючі повідомлення: Автоматично видаляються з серверів після завершення таймера.',
            'Контент і медіа: Зберігаються до моменту, поки ви самі їх не видалите.',
            'Видалення облікового запису та бекапи: При видаленні акаунта він миттєво стає невидимим для всіх. Повне видалення з усіх баз даних та зашифрованих резервних копій займає до 30 днів.',
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
      tldr: 'Ми надаємо можливість добровільної інтеграції з YouTube, Spotify, Twitch, Steam, Roblox та GitHub. Ми неухильно дотримуємося політик розробників цих сервісів, не продаємо ваші дані, використовуємо виключно мінімальні дозволи на читання та гарантуємо можливість відв’язання в 1 клік.',
      subsections: [
        {
          id: 'third-party-overview',
          title: '6.1 Загальні положення, згода користувача та відсутність продажу даних',
          content: [
            'Eternal надає користувачам можливість підключати сторонні платформи для відображення підтверджених ігрових рангів, стрімів, репозиторіїв та музичних плейлистів у профілі. Підключення є виключно добровільним.',
            'Ми ніколи не продаємо, не здаємо в оренду та не передаємо ваші облікові дані, токени чи статистику брокерам даних або рекламодавцям.',
            'Ви можете відв’язати будь-яку платформу в 1 клік у Налаштуваннях → Підключені акаунти, що негайно видаляє всі збережені токени та кешовані дані з наших баз даних та кешу Redis.',
          ],
          bullets: [
            'Лише читання: Ми запитуємо виключно публічні дані профілю, статус активності та ранги.',
            'Безпечна авторизація: Авторизація здійснюється через офіційні протоколи OAuth 2.0 та OpenID.',
            'Миттєве відкликання: Відв’язання акаунта повністю видаляє збережені токени та дані.',
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
            'Ми запитуємо доступ лише до інформації профілю, поточного треку, улюблених пісень та плейлистів. Ми ніколи не маємо доступу до ваших платіжних даних або пароля Spotify.',
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
            'Напишіть нам на privacy@eternal.app із будь-якими запитаннями щодо цієї Політики конфіденційності або обробки ваших даних.',
            'Для зв’язку з офіцером із захисту даних (DPO): dpo@eternal.app.',
            'Звіти про безпеку та вразливості: security@eternal.app.',
          ],
        },
      ],
    },
  ],
};

// 3. German (Deutsch)
const DE_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Produkt',
    safety: 'Sicherheit',
    support: 'Support',
    blog: 'Blog',
    developers: 'Entwickler',
    careers: 'Karriere',
    openEternal: 'Eternal öffnen',
    infoTitle: 'Informationen',
    centersTitle: 'Zentren',
    resourcesTitle: 'Ressourcen',
    collectionsTitle: 'Sammlungen',
    learnTitle: 'Lernen',
    buildTitle: 'Erstellen',
    familyCenter: 'Familienbereich',
    safetyLibrary: 'Sicherheitsbibliothek',
    helpCenter: 'Hilfebereich',
    feedback: 'Feedback & Ideen',
  },
  hero: {
    title: 'ETERNAL DATENSCHUTZRICHTLINIE',
    effectiveDate: 'Gültig ab: 1. September 2026 • Zuletzt aktualisiert: 28. August 2026',
    description:
      'Wir haben Eternal mit Transparenz, Sicherheit und Datenschutz im Mittelpunkt entwickelt. Diese Seite erklärt in klaren Worten, wie wir mit deinen Beiträgen, Nachrichten, Sprachräumen und Musik-Streams umgehen.',
  },
  toc: {
    contents: 'Inhalt',
    readProgress: '% gelesen',
    print: 'Drucken',
    backToTop: 'Nach oben',
  },
  callout: {
    briefly: 'Kurz gesagt',
  },
  footer: {
    language: 'Sprache',
    social: 'Soziale Netzwerke',
    columns: {
      product: 'Produkt',
      download: 'Herunterladen',
      feedDiscover: 'Feed & Entdecken',
      voiceVideo: 'Sprache & Video',
      messenger: 'Messenger',
      musicHub: 'Musik-Hub',
      status: 'Systemstatus',
      company: 'Unternehmen',
      about: 'Über uns',
      jobs: 'Karriere',
      brand: 'Marke',
      newsroom: 'Newsroom',
      resources: 'Ressourcen',
      support: 'Support',
      safety: 'Sicherheit',
      blog: 'Blog',
      creators: 'Creators',
      community: 'Community',
      developers: 'Entwickler',
      feedback: 'Feedback',
      policies: 'Richtlinien',
      terms: 'Nutzungsbedingungen',
      privacy: 'Datenschutz',
      cookieSettings: 'Cookie-Einstellungen',
      guidelines: 'Richtlinien',
      acknowledgements: 'Danksagungen',
      licenses: 'Lizenzen',
      companyInfo: 'Impressum',
    },
  },
};

// 4. Spanish (Español)
const ES_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Producto',
    safety: 'Seguridad',
    support: 'Soporte',
    blog: 'Blog',
    developers: 'Desarrolladores',
    careers: 'Empleo',
    openEternal: 'Abrir Eternal',
    infoTitle: 'Información',
    centersTitle: 'Centros',
    resourcesTitle: 'Recursos',
    hubsTitle: 'Centros',
    collectionsTitle: 'Colecciones',
    learnTitle: 'Aprender',
    buildTitle: 'Construir',
    familyCenter: 'Centro familiar',
    safetyLibrary: 'Biblioteca de seguridad',
    safetyNews: 'Noticias de seguridad',
    teenCharter: 'Carta para adolescentes',
    parentHub: 'Centro para padres',
    policyHub: 'Centro de políticas',
    privacyHub: 'Centro de privacidad',
    transparencyHub: 'Centro de transparencia',
    wellbeingHub: 'Centro de bienestar',
    helpCenter: 'Centro de ayuda',
    feedback: 'Comentarios',
  },
  hero: {
    title: 'POLÍTICA DE PRIVACIDAD DE ETERNAL',
    effectiveDate:
      'Fecha de vigencia: 1 de septiembre de 2026 • Última actualización: 28 de agosto de 2026',
    description:
      'Construimos Eternal pensando en la transparencia y la privacidad. Esta página explica en palabras sencillas cómo manejamos tus publicaciones, mensajes, salas de voz y música.',
  },
  toc: {
    contents: 'Contenido',
    readProgress: '% leído',
    print: 'Imprimir',
    backToTop: 'Volver arriba',
  },
  callout: {
    briefly: 'En resumen',
  },
  footer: {
    language: 'Idioma',
    social: 'Redes sociales',
    columns: {
      product: 'Producto',
      download: 'Descargar',
      feedDiscover: 'Feed y Descubrir',
      voiceVideo: 'Voz y Vídeo',
      messenger: 'Mensajería',
      musicHub: 'Centro de Música',
      status: 'Estado',
      company: 'Compañía',
      about: 'Sobre nosotros',
      jobs: 'Empleo',
      brand: 'Marca',
      newsroom: 'Sala de prensa',
      resources: 'Recursos',
      support: 'Soporte',
      safety: 'Seguridad',
      blog: 'Blog',
      creators: 'Creadores',
      community: 'Comunidad',
      developers: 'Desarrolladores',
      feedback: 'Comentarios',
      policies: 'Políticas',
      terms: 'Términos',
      privacy: 'Privacidad',
      cookieSettings: 'Ajustes de cookies',
      guidelines: 'Directrices',
      acknowledgements: 'Agradecimientos',
      licenses: 'Licencias',
      companyInfo: 'Información de la empresa',
    },
  },
};

// 5. French (Français)
const FR_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Produit',
    safety: 'Sécurité',
    support: 'Assistance',
    blog: 'Blog',
    developers: 'Développeurs',
    careers: 'Emplois',
    openEternal: 'Ouvrir Eternal',
    infoTitle: 'Informations',
    centersTitle: 'Centres',
    resourcesTitle: 'Ressources',
    hubsTitle: 'Centres',
    collectionsTitle: 'Collections',
    learnTitle: 'Apprendre',
    buildTitle: 'Créer',
    familyCenter: 'Centre familial',
    safetyLibrary: 'Bibliothèque de sécurité',
    safetyNews: 'Actualités de sécurité',
    teenCharter: 'Charte pour les ados',
    parentHub: 'Espace Parents',
    policyHub: 'Centre des politiques',
    privacyHub: 'Espace Confidentialité',
    transparencyHub: 'Centre de transparence',
    wellbeingHub: 'Espace Bien-être',
    helpCenter: 'Centre d’aide',
    feedback: 'Commentaires',
  },
  hero: {
    title: 'POLITIQUE DE CONFIDENTIALITÉ D’ETERNAL',
    effectiveDate:
      'Date d’entrée en vigueur : 1er septembre 2026 • Dernière mise à jour : 28 août 2026',
    description:
      'Nous avons conçu Eternal avec transparence et sécurité. Cette page explique simplement comment nous traitons vos publications, messages, salons vocaux et musique partagée.',
  },
  toc: {
    contents: 'Sommaire',
    readProgress: '% lu',
    print: 'Imprimer',
    backToTop: 'Haut de page',
  },
  callout: {
    briefly: 'En résumé',
  },
  footer: {
    language: 'Langue',
    social: 'Réseaux sociaux',
    columns: {
      product: 'Produit',
      download: 'Télécharger',
      feedDiscover: 'Fil et Découverte',
      voiceVideo: 'Salons vocaux et vidéo',
      messenger: 'Messagerie',
      musicHub: 'Espace Musique',
      status: 'État du service',
      company: 'Entreprise',
      about: 'À propos',
      jobs: 'Emplois',
      brand: 'Marque',
      newsroom: 'Actualités',
      resources: 'Ressources',
      support: 'Assistance',
      safety: 'Sécurité',
      blog: 'Blog',
      creators: 'Créateurs',
      community: 'Communauté',
      developers: 'Développeurs',
      feedback: 'Commentaires',
      policies: 'Politiques',
      terms: 'Conditions',
      privacy: 'Confidentialité',
      cookieSettings: 'Paramètres des cookies',
      guidelines: 'Charte d’utilisation',
      acknowledgements: 'Remerciements',
      licenses: 'Licences',
      companyInfo: 'Informations sur l’entreprise',
    },
  },
};

// 6. Italian (Italiano)
const IT_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Prodotto',
    safety: 'Sicurezza',
    support: 'Supporto',
    blog: 'Blog',
    developers: 'Sviluppatori',
    careers: 'Lavora con noi',
    openEternal: 'Apri Eternal',
    infoTitle: 'Informazioni',
    centersTitle: 'Centri',
    resourcesTitle: 'Risorse',
    hubsTitle: 'Hub',
    collectionsTitle: 'Raccolte',
    learnTitle: 'Impara',
    buildTitle: 'Sviluppa',
    familyCenter: 'Centro famiglia',
    safetyLibrary: 'Libreria di sicurezza',
    safetyNews: 'Notizie sulla sicurezza',
    teenCharter: 'Carta per adolescenti',
    parentHub: 'Hub genitori',
    policyHub: 'Hub policy',
    privacyHub: 'Hub privacy',
    transparencyHub: 'Hub trasparenza',
    wellbeingHub: 'Hub benessere',
    helpCenter: 'Centro assistenza',
    feedback: 'Feedback',
  },
  hero: {
    title: 'INFORMATIVA SULLA PRIVACY DI ETERNAL',
    effectiveDate:
      'Data di entrata in vigore: 1 settembre 2026 • Ultimo aggiornamento: 28 agosto 2026',
    description:
      'Abbiamo creato Eternal pensando a trasparenza, sicurezza e controllo degli utenti.',
  },
  toc: {
    contents: 'Indice',
    readProgress: '% letto',
    print: 'Stampa',
    backToTop: 'Torna all’inizio',
  },
  callout: {
    briefly: 'In breve',
  },
  footer: {
    language: 'Lingua',
    social: 'Social',
    columns: {
      product: 'Prodotto',
      download: 'Scarica',
      feedDiscover: 'Feed e Scopri',
      voiceVideo: 'Voce e Video',
      messenger: 'Messaggi',
      musicHub: 'Hub Musicale',
      status: 'Stato del sistema',
      company: 'Azienda',
      about: 'Chi siamo',
      jobs: 'Lavora con noi',
      brand: 'Marchio',
      newsroom: 'Sala stampa',
      resources: 'Risorse',
      support: 'Supporto',
      safety: 'Sicurezza',
      blog: 'Blog',
      creators: 'Creator',
      community: 'Community',
      developers: 'Sviluppatori',
      feedback: 'Feedback',
      policies: 'Normative',
      terms: 'Termini di servizio',
      privacy: 'Privacy',
      cookieSettings: 'Impostazioni cookie',
      guidelines: 'Linee guida',
      acknowledgements: 'Riconoscimenti',
      licenses: 'Licenze',
      companyInfo: 'Informazioni aziendali',
    },
  },
};

// 7. Hungarian (Magyar)
const HU_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Termék',
    safety: 'Biztonság',
    support: 'Támogatás',
    blog: 'Blog',
    developers: 'Fejlesztők',
    careers: 'Karrier',
    openEternal: 'Eternal megnyitása',
    infoTitle: 'Információ',
    centersTitle: 'Központok',
    resourcesTitle: 'Források',
    hubsTitle: 'Központok',
    collectionsTitle: 'Gyűjtemények',
    learnTitle: 'Tanulás',
    buildTitle: 'Építés',
    familyCenter: 'Családi Központ',
    safetyLibrary: 'Biztonsági Könyvtár',
    safetyNews: 'Biztonsági Hírek',
    teenCharter: 'Tini Charta',
    parentHub: 'Szülői Központ',
    policyHub: 'Irányelvek Központ',
    privacyHub: 'Adatvédelmi Központ',
    transparencyHub: 'Átláthatósági Központ',
    wellbeingHub: 'Jólléti Központ',
    helpCenter: 'Súgóközpont',
    feedback: 'Visszajelzés',
  },
  hero: {
    title: 'ETERNAL ADATVÉDELMI IRÁNYELVEK',
    effectiveDate:
      'Hatálybalépés dátuma: 2026. szeptember 1. • Utolsó frissítés: 2026. augusztus 28.',
    description:
      'Az Eternal platformot az átláthatóság és a felhasználói biztonság jegyében építettük fel.',
  },
  toc: {
    contents: 'Tartalom',
    readProgress: '% elolvasva',
    print: 'Nyomtatás',
    backToTop: 'Ugrás a tetejére',
  },
  callout: {
    briefly: 'Röviden erről',
  },
  footer: {
    language: 'Nyelv',
    social: 'Közösségi média',
    columns: {
      product: 'Termék',
      download: 'Letöltés',
      feedDiscover: 'Hírfolyam és Felfedezés',
      voiceVideo: 'Hang és Videó',
      messenger: 'Üzenetek',
      musicHub: 'Zene Központ',
      status: 'Állapot',
      company: 'Vállalat',
      about: 'Rólunk',
      jobs: 'Állások',
      brand: 'Márka',
      newsroom: 'Hírek',
      resources: 'Források',
      support: 'Támogatás',
      safety: 'Biztonság',
      blog: 'Blog',
      creators: 'Alkotók',
      community: 'Közösség',
      developers: 'Fejlesztők',
      feedback: 'Visszajelzés',
      policies: 'Irányelvek',
      terms: 'Feltételek',
      privacy: 'Adatvédelem',
      cookieSettings: 'Süti beállítások',
      guidelines: 'Irányelvek',
      acknowledgements: 'Köszönetnyilvánítás',
      licenses: 'Licencek',
      companyInfo: 'Céginformáció',
    },
  },
};

// 8. Dutch (Nederlands)
const NL_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Product',
    safety: 'Veiligheid',
    support: 'Ondersteuning',
    blog: 'Blog',
    developers: 'Ontwikkelaars',
    careers: 'Vacatures',
    openEternal: 'Open Eternal',
    infoTitle: 'Informatie',
    centersTitle: 'Centra',
    resourcesTitle: 'Bronnen',
    hubsTitle: 'Hubs',
    collectionsTitle: 'Collecties',
    learnTitle: 'Leren',
    buildTitle: 'Bouwen',
    familyCenter: 'Gezinscentrum',
    safetyLibrary: 'Veiligheidsbibliotheek',
    safetyNews: 'Veiligheidsnieuws',
    teenCharter: 'Tienerhandvest',
    parentHub: 'Ouderhub',
    policyHub: 'Beleidshub',
    privacyHub: 'Privacyhub',
    transparencyHub: 'Transparantiehub',
    wellbeingHub: 'Welzijnshub',
    helpCenter: 'Helpcentrum',
    feedback: 'Feedback',
  },
  hero: {
    title: 'ETERNAL PRIVACYBELEID',
    effectiveDate: 'Ingangsdatum: 1 september 2026 • Laatst bijgewerkt: 28 augustus 2026',
    description: 'We hebben Eternal gebouwd met transparantie en veiligheid als prioriteit.',
  },
  toc: {
    contents: 'Inhoudsopgave',
    readProgress: '% gelezen',
    print: 'Afdrukken',
    backToTop: 'Naar boven',
  },
  callout: {
    briefly: 'Kort hierover',
  },
  footer: {
    language: 'Taal',
    social: 'Sociaal',
    columns: {
      product: 'Product',
      download: 'Downloaden',
      feedDiscover: 'Feed & Ontdekken',
      voiceVideo: 'Spraak & Video',
      messenger: 'Berichten',
      musicHub: 'Muziek Hub',
      status: 'Status',
      company: 'Bedrijf',
      about: 'Over ons',
      jobs: 'Vacatures',
      brand: 'Merk',
      newsroom: 'Nieuws',
      resources: 'Bronnen',
      support: 'Ondersteuning',
      safety: 'Veiligheid',
      blog: 'Blog',
      creators: 'Makers',
      community: 'Community',
      developers: 'Ontwikkelaars',
      feedback: 'Feedback',
      policies: 'Beleid',
      terms: 'Voorwaarden',
      privacy: 'Privacy',
      cookieSettings: 'Cookie-instellingen',
      guidelines: 'Richtlijnen',
      acknowledgements: 'Dankbetuigingen',
      licenses: 'Licenties',
      companyInfo: 'Bedrijfsinformatie',
    },
  },
};

// 9. Polish (Polski)
const PL_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Produkt',
    safety: 'Bezpieczeństwo',
    support: 'Wsparcie',
    blog: 'Blog',
    developers: 'Deweloperzy',
    careers: 'Kariera',
    openEternal: 'Otwórz Eternal',
    infoTitle: 'Informacje',
    centersTitle: 'Centra',
    resourcesTitle: 'Zasoby',
    hubsTitle: 'Centra',
    collectionsTitle: 'Kolekcje',
    learnTitle: 'Nauka',
    buildTitle: 'Tworzenie',
    familyCenter: 'Centrum rodzinne',
    safetyLibrary: 'Biblioteka bezpieczeństwa',
    safetyNews: 'Wiadomości o bezpieczeństwie',
    teenCharter: 'Karta nastolatków',
    parentHub: 'Centrum dla rodziców',
    policyHub: 'Centrum zasad',
    privacyHub: 'Centrum prywatności',
    transparencyHub: 'Centrum przejrzystości',
    wellbeingHub: 'Centrum dobrego samopoczucia',
    helpCenter: 'Centrum pomocy',
    feedback: 'Opinie',
  },
  hero: {
    title: 'POLITYKA PRYWATNOŚCI ETERNAL',
    effectiveDate:
      'Data wejścia w życie: 1 września 2026 • Ostatnia aktualizacja: 28 sierpnia 2026',
    description:
      'Stworzyliśmy Eternal z myślą o pełnej przejrzystości, bezpieczeństwie i kontroli użytkownika.',
  },
  toc: {
    contents: 'Spis treści',
    readProgress: '% przeczytano',
    print: 'Drukuj',
    backToTop: 'Do góry',
  },
  callout: {
    briefly: 'Krótko o tym',
  },
  footer: {
    language: 'Język',
    social: 'Media społecznościowe',
    columns: {
      product: 'Produkt',
      download: 'Pobierz',
      feedDiscover: 'Aktualności i Odkrywaj',
      voiceVideo: 'Głos i Wideo',
      messenger: 'Komunikator',
      musicHub: 'Centrum Muzyki',
      status: 'Status systemu',
      company: 'Firma',
      about: 'O nas',
      jobs: 'Praca',
      brand: 'Marka',
      newsroom: 'Wiadomości',
      resources: 'Zasoby',
      support: 'Wsparcie',
      safety: 'Bezpieczeństwo',
      blog: 'Blog',
      creators: 'Twórcy',
      community: 'Społeczność',
      developers: 'Deweloperzy',
      feedback: 'Opinie',
      policies: 'Zasady',
      terms: 'Regulamin',
      privacy: 'Prywatność',
      cookieSettings: 'Ustawienia plików cookie',
      guidelines: 'Wytyczne dla społeczności',
      acknowledgements: 'Podziękowania',
      licenses: 'Licencje',
      companyInfo: 'Informacje o firmie',
    },
  },
};

// 10. Portuguese (Português - Brasil)
const PT_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Produto',
    safety: 'Segurança',
    support: 'Suporte',
    blog: 'Blog',
    developers: 'Desenvolvedores',
    careers: 'Carreiras',
    openEternal: 'Abrir Eternal',
    infoTitle: 'Informações',
    centersTitle: 'Centros',
    resourcesTitle: 'Recursos',
    hubsTitle: 'Centros',
    collectionsTitle: 'Coleções',
    learnTitle: 'Aprender',
    buildTitle: 'Criar',
    familyCenter: 'Central da Família',
    safetyLibrary: 'Biblioteca de Segurança',
    safetyNews: 'Notícias de Segurança',
    teenCharter: 'Estatuto dos Adolescentes',
    parentHub: 'Central dos Pais',
    policyHub: 'Central de Diretrizes',
    privacyHub: 'Central de Privacidade',
    transparencyHub: 'Central de Transparência',
    wellbeingHub: 'Central de Bem-estar',
    helpCenter: 'Central de Ajuda',
    feedback: 'Feedback',
  },
  hero: {
    title: 'POLÍTICA DE PRIVACIDADE DA ETERNAL',
    effectiveDate:
      'Data de vigência: 1 de setembro de 2026 • Última atualização: 28 de agosto de 2026',
    description:
      'Construímos o Eternal com transparência e segurança como princípios fundamentais.',
  },
  toc: {
    contents: 'Índice',
    readProgress: '% lido',
    print: 'Imprimir',
    backToTop: 'Voltar ao topo',
  },
  callout: {
    briefly: 'Em resumo',
  },
  footer: {
    language: 'Idioma',
    social: 'Redes sociais',
    columns: {
      product: 'Produto',
      download: 'Baixar',
      feedDiscover: 'Feed e Explorar',
      voiceVideo: 'Voz e Vídeo',
      messenger: 'Mensagens',
      musicHub: 'Hub de Música',
      status: 'Status',
      company: 'Empresa',
      about: 'Sobre nós',
      jobs: 'Vagas',
      brand: 'Marca',
      newsroom: 'Notícias',
      resources: 'Recursos',
      support: 'Suporte',
      safety: 'Segurança',
      blog: 'Blog',
      creators: 'Criadores',
      community: 'Comunidade',
      developers: 'Desenvolvedores',
      feedback: 'Feedback',
      policies: 'Políticas',
      terms: 'Termos',
      privacy: 'Privacidade',
      cookieSettings: 'Configurações de cookies',
      guidelines: 'Diretrizes da Comunidade',
      acknowledgements: 'Agradecimentos',
      licenses: 'Licenças',
      companyInfo: 'Informações da empresa',
    },
  },
};

// 11. Turkish (Türkçe)
const TR_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'Ürün',
    safety: 'Güvenlik',
    support: 'Destek',
    blog: 'Blog',
    developers: 'Geliştiriciler',
    careers: 'Kariyer',
    openEternal: "Eternal'ı Aç",
    infoTitle: 'Bilgi',
    centersTitle: 'Merkezler',
    resourcesTitle: 'Kaynaklar',
    hubsTitle: 'Merkezler',
    collectionsTitle: 'Koleksiyonlar',
    learnTitle: 'Öğren',
    buildTitle: 'Geliştir',
    familyCenter: 'Aile Merkezi',
    safetyLibrary: 'Güvenlik Kütüphanesi',
    safetyNews: 'Güvenlik Haberleri',
    teenCharter: 'Gençlik İlkeleri',
    parentHub: 'Ebeveyn Merkezi',
    policyHub: 'Politika Merkezi',
    privacyHub: 'Gizlilik Merkezi',
    transparencyHub: 'Şeffaflık Merkezi',
    wellbeingHub: 'Sağlık ve Refah Merkezi',
    helpCenter: 'Yardım Merkezi',
    feedback: 'Geri Bildirim',
  },
  hero: {
    title: 'ETERNAL GİZLİLİK POLİTİKASI',
    effectiveDate: 'Yürürlük Tarihi: 1 Eylül 2026 • Son Güncelleme: 28 Ağustos 2026',
    description:
      "Eternal'ı şeffaflık, güvenlik ve kullanıcı kontrolünü ön planda tutarak geliştirdik.",
  },
  toc: {
    contents: 'İçindekiler',
    readProgress: '% okundu',
    print: 'Yazdır',
    backToTop: 'Yukarı Dön',
  },
  callout: {
    briefly: 'Kısaca bu konuda',
  },
  footer: {
    language: 'Dil',
    social: 'Sosyal',
    columns: {
      product: 'Ürün',
      download: 'İndir',
      feedDiscover: 'Akış ve Keşfet',
      voiceVideo: 'Ses ve Görüntü',
      messenger: 'Mesajlaşma',
      musicHub: 'Müzik Merkezi',
      status: 'Sistem Durumu',
      company: 'Şirket',
      about: 'Hakkımızda',
      jobs: 'Kariyer',
      brand: 'Marka',
      newsroom: 'Basın Odası',
      resources: 'Kaynaklar',
      support: 'Destek',
      safety: 'Güvenlik',
      blog: 'Blog',
      creators: 'İçerik Üreticileri',
      community: 'Topluluk',
      developers: 'Geliştiriciler',
      feedback: 'Geri Bildirim',
      policies: 'İlkeler',
      terms: 'Kullanım Koşulları',
      privacy: 'Gizlilik',
      cookieSettings: 'Çerez Ayarları',
      guidelines: 'Topluluk Kuralları',
      acknowledgements: 'Teşekkürler',
      licenses: 'Lisanslar',
      companyInfo: 'Şirket Bilgileri',
    },
  },
};

// 12. Japanese (日本語)
const JA_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: 'プロダクト',
    safety: '安全性とセキュリティ',
    support: 'サポート',
    blog: 'ブログ',
    developers: '開発者',
    careers: '採用情報',
    openEternal: 'Eternalを開く',
    infoTitle: '情報',
    centersTitle: 'センター',
    resourcesTitle: 'リソース',
    hubsTitle: 'ハブ',
    collectionsTitle: 'コレクション',
    learnTitle: '学ぶ',
    buildTitle: '開発する',
    familyCenter: 'ファミリーセンター',
    safetyLibrary: 'セーフティライブラリ',
    safetyNews: 'セーフティニュース',
    teenCharter: 'ティーン憲章',
    parentHub: '保護者向けハブ',
    policyHub: 'ポリシーハブ',
    privacyHub: 'プライバシーハブ',
    transparencyHub: '透明性ハブ',
    wellbeingHub: 'ウェルビーイングハブ',
    helpCenter: 'ヘルプセンター',
    feedback: 'フィードバック',
  },
  hero: {
    title: 'ETERNAL プライバシーポリシー',
    effectiveDate: '発効日：2026年9月1日 • 最終更新：2026年8月28日',
    description:
      'Eternalは透明性とセキュリティを最優先に設計されています。投稿、メッセージ、ボイスルーム、音楽共有の取り扱いと、お客様のデータ管理方法について説明します。',
  },
  toc: {
    contents: '目次',
    readProgress: '% 読了',
    print: '印刷',
    backToTop: 'トップへ戻る',
  },
  callout: {
    briefly: '概要',
  },
  footer: {
    language: '言語',
    social: 'ソーシャル',
    columns: {
      product: 'プロダクト',
      download: 'ダウンロード',
      feedDiscover: 'フィード＆発見',
      voiceVideo: 'ボイス＆ビデオ',
      messenger: 'メッセージ',
      musicHub: 'ミュージックハブ',
      status: '稼働状況',
      company: '会社情報',
      about: 'Eternalについて',
      jobs: '採用情報',
      brand: 'ブランド',
      newsroom: 'ニュースルーム',
      resources: 'リソース',
      support: 'サポート',
      safety: '安全性',
      blog: 'ブログ',
      creators: 'クリエイター',
      community: 'コミュニティ',
      developers: '開発者',
      feedback: 'フィードバック',
      policies: '規約・ポリシー',
      terms: '利用規約',
      privacy: 'プライバシー',
      cookieSettings: 'Cookie設定',
      guidelines: 'ガイドライン',
      acknowledgements: '謝辞',
      licenses: 'ライセンス',
      companyInfo: '会社概要',
    },
  },
};

// 13. Korean (한국어)
const KO_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: '제품',
    safety: '보안 및 안전',
    support: '지원',
    blog: '블로그',
    developers: '개발자',
    careers: '채용',
    openEternal: 'Eternal 열기',
    infoTitle: '정보',
    centersTitle: '센터',
    resourcesTitle: '리소스',
    hubsTitle: '허브',
    collectionsTitle: '컬렉션',
    learnTitle: '학습',
    buildTitle: '개발',
    familyCenter: '패밀리 센터',
    safetyLibrary: '안전 라이브러리',
    safetyNews: '안전 뉴스',
    teenCharter: '청소년 헌장',
    parentHub: '학부모 허브',
    policyHub: '정책 허브',
    privacyHub: '개인정보 보호 허브',
    transparencyHub: '투명성 허브',
    wellbeingHub: '웰빙 허브',
    helpCenter: '고객지원 센터',
    feedback: '피드백',
  },
  hero: {
    title: 'ETERNAL 개인정보 처리방침',
    effectiveDate: '시행일: 2026년 9월 1일 • 최종 수정일: 2026년 8월 28일',
    description: 'Eternal은 투명성, 보안 및 사용자 개인정보 보호를 최우선으로 설계되었습니다.',
  },
  toc: {
    contents: '목차',
    readProgress: '% 읽음',
    print: '인쇄',
    backToTop: '맨 위로',
  },
  callout: {
    briefly: '간단히 보기',
  },
  footer: {
    language: '언어',
    social: '소셜',
    columns: {
      product: '제품',
      download: '다운로드',
      feedDiscover: '피드 및 탐색',
      voiceVideo: '음성 및 영상',
      messenger: '메신저',
      musicHub: '뮤직 허브',
      status: '서버 상태',
      company: '회사',
      about: '회사 소개',
      jobs: '채용',
      brand: '브랜드',
      newsroom: '뉴스룸',
      resources: '리소스',
      support: '지원',
      safety: '안전',
      blog: '블로그',
      creators: '크리에이터',
      community: '커뮤니티',
      developers: '개발자',
      feedback: '피드백',
      policies: '정책',
      terms: '이용약관',
      privacy: '개인정보 보호',
      cookieSettings: '쿠키 설정',
      guidelines: '커뮤니티 가이드라인',
      acknowledgements: '감사의 글',
      licenses: '라이선스',
      companyInfo: '회사 정보',
    },
  },
};

// 14. Traditional Chinese (繁體中文)
const ZHT_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: '產品',
    safety: '安全與隱私',
    support: '支援',
    blog: '部落格',
    developers: '開發者',
    careers: '工作機會',
    openEternal: '開啟 Eternal',
    infoTitle: '資訊',
    centersTitle: '中心',
    resourcesTitle: '資源',
    hubsTitle: '中樞',
    collectionsTitle: '精選集',
    learnTitle: '學習',
    buildTitle: '建置',
    familyCenter: '家庭中心',
    safetyLibrary: '安全資源庫',
    safetyNews: '安全最新動態',
    teenCharter: '青少年安全守則',
    parentHub: '家長中心',
    policyHub: '政策中心',
    privacyHub: '隱私權中樞',
    transparencyHub: '透明度報告中心',
    wellbeingHub: '身心健康中心',
    helpCenter: '說明中心',
    feedback: '意見回饋',
  },
  hero: {
    title: 'ETERNAL 隱私權政策',
    effectiveDate: '生效日期：2026年9月1日 • 上次更新：2026年8月28日',
    description: '我們以透明、安全和給予使用者完全控制權為核心打造了 Eternal。',
  },
  toc: {
    contents: '目錄',
    readProgress: '% 已閱讀',
    print: '列印',
    backToTop: '回到頁首',
  },
  callout: {
    briefly: '簡要說明',
  },
  footer: {
    language: '語言',
    social: '社群媒體',
    columns: {
      product: '產品',
      download: '下載',
      feedDiscover: '動態與探索',
      voiceVideo: '語音與視訊',
      messenger: '即時通訊',
      musicHub: '音樂中心',
      status: '服務狀態',
      company: '公司',
      about: '關於我們',
      jobs: '工作機會',
      brand: '品牌識別',
      newsroom: '新聞中心',
      resources: '資源',
      support: '技術支援',
      safety: '安全中心',
      blog: '部落格',
      creators: '創作者',
      community: '社群',
      developers: '開發者',
      feedback: '意見回饋',
      policies: '政策條款',
      terms: '服務條款',
      privacy: '隱私權政策',
      cookieSettings: 'Cookie 設定',
      guidelines: '社群守則',
      acknowledgements: '致謝名單',
      licenses: '授權許可',
      companyInfo: '公司資訊',
    },
  },
};

// 15. Simplified Chinese (简体中文)
const ZHS_UI: LegalUITranslation = {
  ...EN_UI,
  navbar: {
    ...EN_UI.navbar,
    product: '产品',
    safety: '安全与隐私',
    support: '支持',
    blog: '博客',
    developers: '开发者',
    careers: '招贤纳士',
    openEternal: '打开 Eternal',
    infoTitle: '信息',
    centersTitle: '中心',
    resourcesTitle: '资源',
    hubsTitle: '枢纽',
    collectionsTitle: '集合',
    learnTitle: '学习',
    buildTitle: '开发',
    familyCenter: '家庭中心',
    safetyLibrary: '安全知识库',
    safetyNews: '安全动态',
    teenCharter: '青少年守则',
    parentHub: '家长专区',
    policyHub: '政策中心',
    privacyHub: '隐私中心',
    transparencyHub: '透明度中心',
    wellbeingHub: '身心健康中心',
    helpCenter: '帮助中心',
    feedback: '意见反馈',
  },
  hero: {
    title: 'ETERNAL 隐私政策',
    effectiveDate: '生效日期：2026年9月1日 • 最近更新：2026年8月28日',
    description: '我们在设计 Eternal 时始终将透明度、安全性和用户控制权放在首位。',
  },
  toc: {
    contents: '目录',
    readProgress: '% 已阅读',
    print: '打印',
    backToTop: '返回顶部',
  },
  callout: {
    briefly: '简要说明',
  },
  footer: {
    language: '语言',
    social: '社交平台',
    columns: {
      product: '产品',
      download: '下载',
      feedDiscover: '动态与探索',
      voiceVideo: '语音与视频',
      messenger: '即时通讯',
      musicHub: '音乐中心',
      status: '服务状态',
      company: '公司',
      about: '关于我们',
      jobs: '工作机会',
      brand: '品牌资产',
      newsroom: '新闻中心',
      resources: '资源',
      support: '技术支持',
      safety: '安全中心',
      blog: '博客',
      creators: '创作者',
      community: '社区',
      developers: '开发者',
      feedback: '意见反馈',
      policies: '政策条款',
      terms: '服务条款',
      privacy: '隐私政策',
      cookieSettings: 'Cookie 设置',
      guidelines: '社区守则',
      acknowledgements: '致谢名单',
      licenses: '许可证明',
      companyInfo: '公司信息',
    },
  },
};

// Map of all language resources
const TRANSLATION_MAP: Record<SupportedLanguage, LegalUITranslation> = {
  English: EN_UI,
  'English (UK)': {
    ...EN_UI,
    footer: {
      ...EN_UI.footer,
      columns: {
        ...EN_UI.footer.columns,
        acknowledgements: 'Acknowledgements',
        licenses: 'Licences',
        companyInfo: 'Company Information',
      },
    },
  },
  Українська: UK_UI,
  Deutsch: DE_UI,
  Español: ES_UI,
  Français: FR_UI,
  Italiano: IT_UI,
  Magyar: HU_UI,
  Nederlands: NL_UI,
  Polski: PL_UI,
  'Português (Brasil)': PT_UI,
  Türkçe: TR_UI,
  日本語: JA_UI,
  한국어: KO_UI,
  繁體中文: ZHT_UI,
  简体中文: ZHS_UI,
};

export const getLegalTranslation = (lang: SupportedLanguage): LegalUITranslation => {
  return TRANSLATION_MAP[lang] || EN_UI;
};
