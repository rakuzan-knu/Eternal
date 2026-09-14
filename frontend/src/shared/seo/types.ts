export type OpenGraphType = 'website' | 'article' | 'profile';

export type TwitterCardType = 'summary' | 'summary_large_image';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface AlternateLangLink {
  lang: string;
  url: string;
}

export interface StructuredDataConfig {
  type?:
    | 'WebSite'
    | 'Organization'
    | 'Article'
    | 'NewsArticle'
    | 'Person'
    | 'ProfilePage'
    | 'SoftwareApplication'
    | 'FAQPage'
    | 'BreadcrumbList';
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
  article?: {
    title: string;
    description: string;
    url: string;
    datePublished?: string;
    dateModified?: string;
    image?: string;
    authorName?: string;
  };
  person?: {
    username: string;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  operatingSystem?: string;
  applicationCategory?: string;
  customJsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export interface SEOProps {
  /**
   * Main title of the page.
   * Will be formatted as: `<title> • <context> | Eternal` or direct string if isRawTitle=true.
   */
  title?: string;
  isRawTitle?: boolean;

  /**
   * Meta description (recommended: 150-160 characters).
   */
  description?: string;

  /**
   * Comma-separated or array of SEO keywords.
   */
  keywords?: string | string[];

  /**
   * Canonical URL path (e.g. `/privacy`, `/about`, `/@durov`).
   * Will be resolved against BASE_URL automatically if relative.
   */
  canonical?: string;

  /**
   * Social sharing image (OpenGraph / Twitter Card).
   * Supports absolute URL or relative path from `/public`.
   */
  ogImage?: string;
  image?: string;
  ogImageAlt?: string;

  /**
   * OpenGraph type: 'website' | 'article' | 'profile'. Defaults to 'website'.
   */
  ogType?: OpenGraphType;
  type?: OpenGraphType | string;

  /**
   * Twitter Card layout: 'summary_large_image' | 'summary'. Defaults to 'summary_large_image'.
   */
  twitterCard?: TwitterCardType;

  /**
   * Search indexing directive: 'index, follow' | 'noindex, nofollow' | 'noindex, follow'.
   * If noIndex=true or noindex=true is passed, defaults to 'noindex, nofollow, noarchive'.
   */
  noIndex?: boolean;
  noindex?: boolean;
  robots?: string;

  /**
   * Theme color meta tag (hex format, default #070709).
   */
  themeColor?: string;

  /**
   * Multi-language hreflang alternates (or auto-generated if query lang is used).
   */
  alternateLanguages?: AlternateLangLink[];

  /**
   * Structured Data (Schema.org JSON-LD) configurations.
   */
  structuredData?: StructuredDataConfig;
}
