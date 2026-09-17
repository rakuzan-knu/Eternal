import { SEOProps } from './types';

export const SEO_BASE_URL =
  (typeof process !== 'undefined' && process.env?.VITE_SITE_URL) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_SITE_URL) ||
  'https://eternalnet.vercel.app';

export const SEO_SITE_NAME = 'Eternal';
export const SEO_TWITTER_HANDLE = '@theeternalnet';
export const SEO_DEFAULT_THEME_COLOR = '#070709';

export const SEO_DEFAULT_TITLE = 'Eternal — Next-Gen Social Network & Community Platform';

export const SEO_DEFAULT_DESCRIPTION =
  'Eternal is the next-generation social network and messenger. Connect, share posts, stories, and chat in real-time with ultra-sleek design and uncompromising privacy.';

export const SEO_DEFAULT_OG_IMAGE = `${SEO_BASE_URL}/images/shared/EternalBanner.png`;

/**
 * Knowledge Graph & Entity Disambiguation Links for Schema.org Organization
 * Helps Google disambiguate "Eternal" from other dictionary terms, movies, and games.
 */
export const SAME_AS_ENTITIES = [
  'https://www.wikidata.org/wiki/Q141248972',
  'https://www.wikidata.org/wiki/Special:EntityPage/Q141248972',
  'https://www.crunchbase.com/organization/eternal-94af',
  'https://www.youtube.com/@eternalapp',
  'https://x.com/theeternalnet',
  'https://twitter.com/theeternalnet',
  'https://www.facebook.com/profile.php?id=61594079787704',
  'https://www.tiktok.com/@eternalsocial',
  'https://github.com/rakuzan-knu',
  'https://www.linkedin.com/company/eternal-social',
  'https://apps.apple.com/app/eternal-social',
  'https://play.google.com/store/apps/details?id=net.eternal.app',
];

export const SUPPORTED_LANGUAGES = ['en', 'ru', 'de', 'fr', 'es', 'zh', 'ja', 'uk'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const PRESERVED_ACRONYMS = new Set([
  'DMCA',
  'GDPR',
  'CCPA',
  'CPRA',
  'LGPD',
  'DSA',
  'API',
  'SDK',
  'ID',
  'FAQ',
  'PWA',
  'URL',
  'URI',
  'SEO',
  'CDN',
  'AI',
  'UI',
  'UX',
  'iOS',
  'EU',
  'UK',
  'US',
  'USA',
  'VR',
  '4K',
]);

/**
 * Normalizes all-caps strings into clean, human-readable Title Case.
 * Preserves standard tech/legal acronyms (GDPR, CCPA, DMCA, API, etc.).
 */
export function toCleanTitleCase(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim();

  // If text is already mixed-case with lowercases, return as-is
  const hasUppercase = /[A-Z]/.test(trimmed);
  const hasLowercase = /[a-z]/.test(trimmed);
  if (hasLowercase) {
    return trimmed;
  }

  // If the text is purely all uppercase, convert to Title Case
  if (hasUppercase && !hasLowercase) {
    return trimmed.replace(/\b[\p{L}\p{N}_+-]+\b/gu, (word, index) => {
      const upper = word.toUpperCase();
      if (PRESERVED_ACRONYMS.has(upper)) {
        return upper;
      }
      const lower = word.toLowerCase();
      // Minor lowercase connector words (except if it's the first word)
      if (
        index > 0 &&
        [
          'and',
          'or',
          'of',
          'for',
          'the',
          'in',
          'on',
          'at',
          'to',
          'a',
          'an',
          'and',
          'in',
          'on',
          'with',
          'for',
        ].includes(lower)
      ) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  return trimmed;
}

/**
 * Format a page title consistently like Instagram/Discord:
 * `<Page Name> • <Context> | Eternal`
 * Automatically eliminates unsightly ALL-CAPS headers.
 */
export function formatTitle(pageTitle?: string, isRawTitle?: boolean): string {
  if (!pageTitle) return SEO_DEFAULT_TITLE;
  const cleanTitle = toCleanTitleCase(pageTitle);
  if (isRawTitle) return cleanTitle;

  // Prevent duplicating site name suffix
  if (
    cleanTitle.endsWith(`• ${SEO_SITE_NAME}`) ||
    cleanTitle.endsWith(`| ${SEO_SITE_NAME}`) ||
    cleanTitle.endsWith(`— ${SEO_SITE_NAME}`)
  ) {
    return cleanTitle;
  }

  return `${cleanTitle} • ${SEO_SITE_NAME}`;
}

/**
 * Resolve canonical URL
 */
export function resolveCanonicalUrl(path?: string, currentSearch?: string): string {
  if (!path) return SEO_BASE_URL;
  const cleanPath = path.startsWith('http')
    ? path
    : `${SEO_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  // If language query param exists (e.g. ?lang=ru), include in self-referencing canonical
  if (currentSearch) {
    const params = new URLSearchParams(currentSearch);
    const lang = params.get('lang');
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      const url = new URL(cleanPath);
      url.searchParams.set('lang', lang);
      return url.toString();
    }
  }

  return cleanPath;
}

/**
 * Predefined Route SEO Configurations
 */
export const PAGE_SEO_PRESETS: Record<string, SEOProps> = {
  home: {
    title: 'Eternal — Next-Gen Social Network & Community Platform',
    isRawTitle: true,
    description: SEO_DEFAULT_DESCRIPTION,
    keywords: [
      'Eternal',
      'Eternal Social Network',
      'Eternal Messenger',
      'Social Network',
      'Real-time Chat',
      'Communities',
      'Social Media App',
    ],
    canonical: '/',
    ogType: 'website',
  },
  explore: {
    title: 'Explore Trending Communities, Posts & Creators',
    description:
      'Discover trending creators, hashtags, stories, and vibrant communities on Eternal.',
    keywords: ['Explore Eternal', 'Trending Posts', 'Discover Creators', 'Social Network'],
    canonical: '/explore',
  },
  about: {
    title: 'About Eternal • Our Story, Vision & Next-Gen Architecture',
    description:
      'Learn about Eternal, our mission to build a state-of-the-art social network, ultra-sleek messenger, and safe community ecosystem.',
    keywords: ['About Eternal', 'Eternal Social Network Story', 'Mission', 'Founders'],
    canonical: '/about',
  },
  companyInformation: {
    title: 'Company Information & Impressum',
    description:
      'Official corporate details, registration, headquarters, and legal representatives of Eternal Network.',
    canonical: '/company-information',
  },
  privacy: {
    title: 'Privacy Policy • How Eternal Protects Your Personal Data',
    description:
      'Read the Eternal Privacy Policy. Learn about our end-to-end encryption, strict zero-data-selling pledge, and GDPR & CCPA privacy controls.',
    keywords: ['Eternal Privacy Policy', 'GDPR Privacy', 'Zero Data Selling', 'Encryption'],
    canonical: '/privacy',
  },
  terms: {
    title: 'Terms of Service • User Agreement & Platform Rules',
    description:
      'Eternal Terms of Service. Understand your rights, community standards, content ownership, and account responsibilities.',
    canonical: '/terms',
  },
  cookiePolicy: {
    title: 'Cookie Policy & Tracking Technologies',
    description:
      'Learn about our transparent cookie usage for essential security, authentication, and user preferences.',
    canonical: '/terms/cookie-policy',
  },
  regionalPrivacy: {
    title: 'Regional Privacy Rights • GDPR, CCPA/CPRA & Global Protections',
    description:
      'Detailed regional privacy rights for users in the European Union (GDPR), California (CCPA/CPRA), Brazil (LGPD), and worldwide.',
    canonical: '/terms/regional-privacy',
  },
  retentionPolicy: {
    title: 'Data Retention & Deletion Policy',
    description:
      'Transparent breakdown of how long data is retained and how account deletion irreversibly removes all messages and media.',
    canonical: '/terms/retention-policy',
  },
  dataPrivacyControls: {
    title: 'Data Privacy Controls & Security Settings Guide',
    description:
      'Interactive guide to managing your privacy, two-factor authentication, device locks, and visibility on Eternal.',
    canonical: '/terms/data-privacy-controls',
  },
  yourDataPackage: {
    title: 'Your Eternal Data Package • Export & Portability Guide',
    description:
      'Download your full Eternal account archive, message history, posts, and media in machine-readable JSON & ZIP formats.',
    canonical: '/terms/your-eternal-data-package',
  },
  copyright: {
    title: 'Copyright Policy, DMCA Notice & IP Protection',
    description:
      'Eternal intellectual property guidelines, DMCA takedown procedures, and designated copyright agent information.',
    canonical: '/copyright',
  },
  paidServices: {
    title: 'Paid Services, Premium Subscriptions & Refund Policy',
    description:
      'Details on paid features, subscriber perks, payment processing, subscription management, and refund terms.',
    canonical: '/terms/paid-services',
  },
  developerTerms: {
    title: 'Developer Terms of Service & API Platform Guidelines',
    description:
      'Terms and policies for developers building bots, extensions, and integrations with Eternal APIs and Webhooks.',
    canonical: '/terms/developer',
  },
  candidatePrivacy: {
    title: 'Applicant & Candidate Recruitment Privacy Policy',
    description:
      'How Eternal collects, stores, and protects personal data during job applications and hiring processes.',
    canonical: '/terms/applicant-candidate-privacy-policy',
  },
  safety: {
    title: 'Safety Center • Protecting Users, Youth & Communities',
    description:
      'Explore Eternal Safety Center. Our proactive safety tools, real-time moderation, family resources, and teen wellbeing protections.',
    canonical: '/safety',
  },
  familyCenter: {
    title: 'Family Center & Parental Guidance Hub',
    description:
      'Supervision controls, screen time tools, and safety education resources for parents and guardians on Eternal.',
    canonical: '/safety/family-center',
  },
  safetyLibrary: {
    title: 'Safety Library • Guides, Tutorials & Anti-Bullying Resources',
    description:
      'Comprehensive educational library for digital safety, scam prevention, harassment blocking, and healthy social habits.',
    canonical: '/safety/library',
  },
  privacyHub: {
    title: 'Privacy Hub • Encryption, Zero-Tracking & Security Protocols',
    description:
      'Deep dive into Eternal cryptographic protocols, biometric device gates, and anti-surveillance infrastructure.',
    canonical: '/safety/privacy',
  },
  transparency: {
    title: 'Transparency Hub & Annual Law Enforcement Audit Reports',
    description:
      'Verified transparency reports covering moderation actions, government requests, and copyright enforcement metrics.',
    canonical: '/safety/transparency',
  },
  safetyNews: {
    title: 'Safety News & Security Bulletins',
    description:
      'Official announcements, security advisories, bug fixes, and safety feature rollouts across Eternal.',
    canonical: '/safety/news',
  },
  policyHub: {
    title: 'Policy Hub • Unified Directory of Platform Rules & Standards',
    description:
      'Complete index of community policies, moderation standards, appeal procedures, and terms.',
    canonical: '/safety/policies',
  },
  teenCharter: {
    title: 'Teen Charter & Youth Digital Rights Code',
    description:
      'Our dedicated charter guaranteeing age-appropriate privacy defaults, anti-grooming protections, and night mode quiet hours for teens.',
    canonical: '/safety/teen-charter',
  },
  wellbeing: {
    title: 'Digital Wellbeing & Screen Time Management',
    description:
      'Mindful scrolling alerts, break reminders, mute notifications, and wellness tools designed to prevent digital burnout.',
    canonical: '/safety/wellbeing',
  },
  lawEnforcement: {
    title: 'Law Enforcement Guidelines & Emergency Request Portal',
    description:
      'Official procedures for verified legal authorities submitting subpoenas, court orders, and emergency disclosure requests.',
    canonical: '/safety/law-enforcement',
  },
  careers: {
    title: 'Careers at Eternal • Join the Team Shaping the Next Era of Social',
    description:
      'Explore open engineering, design, and product roles at Eternal. Work on distributed systems, modern UI, and privacy-first social tech.',
    canonical: '/careers',
  },
  brand: {
    title: 'Brand Assets, Logos, Color Palettes & Media Kit',
    description:
      'Download official Eternal vector logos, brand guidelines, dark mode color tokens, and media press kits.',
    canonical: '/brand',
  },
  download: {
    title: 'Download Eternal • Available for iOS, Android, macOS, Windows & Linux',
    description:
      'Get Eternal on all your devices. Ultra-fast native desktop and mobile apps with seamless real-time message sync.',
    canonical: '/download',
  },
  creators: {
    title: 'Creator Program • Monetization, Subscriber Tiers & Analytics',
    description:
      'Empowering creators with direct monetization, custom subscriber tiers, rich media posts, and audience analytics on Eternal.',
    canonical: '/creators',
  },
  guidelines: {
    title: 'Community Guidelines • Respect, Kindness & Safety',
    description:
      'Our fundamental principles for positive, respectful discourse, anti-hate speech enforcement, and spam prevention.',
    canonical: '/guidelines',
  },
  acknowledgements: {
    title: 'Open Source Acknowledgements & Security Researcher Credits',
    description:
      'Honoring open-source projects, libraries, and ethical security researchers who contribute to Eternal.',
    canonical: '/acknowledgements',
  },
  licenses: {
    title: 'Third-Party Software Licenses & Legal Notices',
    description:
      'Full disclosure of open source and commercial third-party software licenses utilized across the Eternal ecosystem.',
    canonical: '/licenses',
  },
  blog: {
    title: 'Eternal Blog • Product Updates, Engineering Deep Dives & Stories',
    description:
      'Read official product announcements, design case studies, and engineering deep dives from the Eternal team.',
    canonical: '/blog',
  },
  newsroom: {
    title: 'Newsroom & Official Press Releases',
    description:
      'Official press releases, media kits, corporate updates, and media contact info for journalists and partners.',
    canonical: '/newsroom',
  },
};
