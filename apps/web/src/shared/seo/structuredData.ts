import { BreadcrumbItem, FAQItem } from './types';
import {
  SEO_BASE_URL,
  SEO_SITE_NAME,
  SEO_DEFAULT_DESCRIPTION,
  SAME_AS_ENTITIES,
} from './seoConfig';
import { getCdnUrl, getAvatarCdnUrl, toAbsoluteAppUrl } from '../lib/cdn';

/**
 * Generate Schema.org WebSite JSON-LD with Sitelinks SearchBox
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SEO_BASE_URL}/#website`,
    url: SEO_BASE_URL,
    name: SEO_SITE_NAME,
    description: SEO_DEFAULT_DESCRIPTION,
    publisher: {
      '@id': `${SEO_BASE_URL}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SEO_BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: ['en', 'ru', 'de', 'fr', 'es', 'zh', 'ja', 'uk'],
  };
}

/**
 * Generate Schema.org Organization JSON-LD with sameAs entity disambiguation
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SEO_BASE_URL}/#organization`,
    name: SEO_SITE_NAME,
    alternateName: [
      'Eternal Social Network',
      'Eternal Social Media',
      'Eternal Net',
      'Eternal App',
      'Eternal Messenger',
    ],
    url: SEO_BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: toAbsoluteAppUrl('/favicon.svg'),
      width: 512,
      height: 512,
    },
    sameAs: SAME_AS_ENTITIES,
    description: SEO_DEFAULT_DESCRIPTION,
    disambiguatingDescription:
      'Eternal is a modern social network and real-time messaging platform, distinct from dictionary definitions, movies, video games, or apparel stores.',
    slogan: 'One place. All connections.',
    knowsAbout: [
      'Social Media Platform',
      'Real-Time Messaging',
      'Online Communities',
      'Instant Messaging App',
      'Privacy by Design',
      'Digital Wellbeing',
    ],
    foundingDate: '2026',
    email: 'support@eternal.net',
  };
}

/**
 * Generate BreadcrumbList Schema.org JSON-LD
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  if (!items || items.length === 0) return null;

  const fullItems: BreadcrumbItem[] = [
    { name: 'Home', url: SEO_BASE_URL },
    ...items.map((item) => ({
      name: item.name,
      url: toAbsoluteAppUrl(item.url),
    })),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: fullItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate FAQPage Schema.org JSON-LD
 */
export function generateFAQSchema(faqs: FAQItem[]) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate NewsArticle / Article Schema.org JSON-LD for Blog & Newsroom
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
}) {
  const fullUrl = toAbsoluteAppUrl(article.url);

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fullUrl,
    },
    headline: article.title,
    description: article.description,
    image: article.image ? [getCdnUrl(article.image)] : undefined,
    datePublished: article.datePublished || new Date().toISOString(),
    dateModified: article.dateModified || article.datePublished || new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: article.authorName || 'Eternal Editorial Team',
      url: `${SEO_BASE_URL}/about`,
    },
    publisher: {
      '@id': `${SEO_BASE_URL}/#organization`,
    },
  };
}

/**
 * Generate Person & ProfilePage Schema.org JSON-LD for dynamic user profiles
 */
export function generateProfileSchema(user: {
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}) {
  const profileUrl = `${SEO_BASE_URL}/@${user.username}`;
  const avatarAbsolute = getAvatarCdnUrl(user.avatarUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: user.displayName || `@${user.username}`,
      alternateName: `@${user.username}`,
      description: user.bio || `Connect with @${user.username} on Eternal.`,
      image: avatarAbsolute,
      url: profileUrl,
      identifier: user.username,
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/FollowAction',
      },
    },
  };
}

/**
 * Generate SoftwareApplication Schema.org JSON-LD for Download page
 */
export function generateSoftwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Eternal',
    operatingSystem: 'iOS, Android, macOS, Windows, Linux, Web',
    applicationCategory: 'SocialNetworkingApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '12800',
    },
    description:
      'Eternal is the ultra-sleek, privacy-first social network and real-time messenger available across all platforms.',
    downloadUrl: `${SEO_BASE_URL}/download`,
  };
}
