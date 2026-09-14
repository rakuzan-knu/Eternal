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
          'When we say "Eternal", "we", "us", or "our", we mean Eternal Inc., located in Kyiv, Ukraine, along with our global affiliates.',
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
          'We grant you a personal, non-exclusive, non-transferable license to download and use the Eternal web, desktop, and mobile applications solely to access our services. You may not reverse engineer, decompile, or modify our software without written permission.',
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
