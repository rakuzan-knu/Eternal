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
