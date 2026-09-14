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

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'welcome-and-basics',
    number: '1',
    title: 'Welcome to Eternal & The Basics',
    iconName: 'ShieldCheck',
    tldr: 'Eternal brings together feeds, direct chats, voice rooms, and music listening into one platform. We respect your privacy, never sell your data, and require all users to be at least 13 years old (or 16+ where local laws apply).',
    subsections: [
      {
        id: 'our-mission',
        title: '1.1 What is Eternal & Our Core Privacy Promise',
        content: [
          'Eternal is a modern, unified social platform built for friends, creators, and communities. It combines visual social feeds with photos and stories, instant private and group chats with disappearing messages, real-time voice and video hangout rooms, and interactive music streaming with Spotify and SoundCloud.',
          'We follow a simple, transparent rule: we only collect what is strictly necessary to make Eternal work smoothly for you. We do not sell your personal information, posts, or private conversations to advertisers or third parties.',
        ],
        bullets: [
          'No hidden tracking or intrusive ad-profile brokers.',
          'Complete control: you decide what is public, what stays private, and what data you share.',
          'Funded by premium subscriptions and creator features - never by selling your personal data.',
        ],
      },
      {
        id: 'age-requirements',
        title: '1.2 Age Limits & Child Privacy',
        content: [
          'You must be at least 13 years old to create an account and use Eternal. If the law in your country requires you to be older to consent to online services without parental permission (such as 16 in certain European Union countries), you must meet that higher age requirement.',
          'We do not knowingly collect personal data from anyone under the minimum age. If we discover that a user is under the required age limit, we will immediately close the account and remove their personal information from our active databases.',
        ],
      },
      {
        id: 'who-we-are',
        title: '1.3 Who Runs Eternal',
        content: [
          'Eternal is operated by Eternal Inc. When you use our services, we act as the data controller of your personal information under applicable global data protection regulations.',
        ],
      },
    ],
  },
  {
    id: 'information-we-collect',
    number: '2',
    title: 'The Information We Collect & Encryption Architecture',
    iconName: 'Database',
    tldr: 'We collect account details, posts, messages, and connected music. We distinguish between zero-knowledge End-to-End Encrypted (E2EE) secret chats and secure cloud chats. Voice calls are never recorded.',
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
        id: 'e2ee-vs-cloud-architecture',
        title: '2.2 End-to-End Encryption (E2EE) vs. Cloud Synchronization',
        content: [
          'Eternal employs a modern, dual-tier privacy architecture to give you both state-of-the-art security and multi-device convenience:',
        ],
        bullets: [
          'End-to-End Encrypted (E2EE) Secret Chats: In secret 1-on-1 chats, cryptographic keys are generated and stored exclusively on your local devices. Eternal servers only route encrypted payloads; we cannot read your messages, decrypt attachments, or share your private keys.',
          'Cloud-Synchronized Chats: Standard direct messages and group conversations are encrypted in transit (TLS 1.3) and at rest (AES-256) on our secure databases to ensure your conversation history syncs seamlessly across your mobile, web, and desktop clients.',
          'Voice & Video Hangouts (Zero-Recording Guarantee): Voice and video rooms operate in real time over WebRTC. We do NOT record, listen to, or save live calls on our servers.',
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
    title: 'How We Use Your Information & Recommendation Systems',
    iconName: 'Cpu',
    tldr: 'We use your data to power social features and protect security. Our recommendation algorithm currently powers User Follow Suggestions, while post feeds remain chronological.',
    subsections: [
      {
        id: 'service-delivery',
        title: '3.1 Providing & Operating Eternal',
        content: [
          'We use your data to deliver your social feed, sync chats in real time across your devices, connect your voice rooms, send push notifications, and sync "Listen Along" music playback with your friends.',
        ],
      },
      {
        id: 'algorithm-transparency',
        title: '3.2 Recommendation Systems & Algorithm Transparency (EU DSA Art. 27)',
        content: ['We believe in absolute transparency regarding algorithmic recommendations:'],
        bullets: [
          'User Follow Recommendations: Our recommendation engine analyzes mutual connections, shared interests, and language preferences solely to suggest friends and creators you may wish to follow in Explore.',
          'Chronological Post Feeds: Feed posts and stories from accounts you follow are currently delivered in chronological order (by recency), ensuring you see authentic updates without hidden algorithmic filtering or shadow suppression.',
          'Future Algorithmic Controls: As we develop new discovery algorithms, Eternal will always provide clear toggles to switch back to pure chronological sorting at any time.',
        ],
      },
      {
        id: 'safety-and-security',
        title: '3.3 Safety, Moderation & Anti-Abuse',
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
];
