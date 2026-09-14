import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguageStore, SupportedLanguage } from '../lib/language/languageStore';
import { getCdnUrl, toAbsoluteAppUrl } from '../lib/cdn';
import { SEOProps, OpenGraphType } from './types';
import {
  SEO_BASE_URL,
  SEO_SITE_NAME,
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_OG_IMAGE,
  SEO_TWITTER_HANDLE,
  SEO_DEFAULT_THEME_COLOR,
  SUPPORTED_LANGUAGES,
  formatTitle,
  resolveCanonicalUrl,
} from './seoConfig';
import {
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateArticleSchema,
  generateProfileSchema,
  generateSoftwareAppSchema,
} from './structuredData';

function setMetaTag(name: string, content: string, isProperty = false) {
  if (typeof document === 'undefined') return;
  const attribute = isProperty ? 'property' : 'name';
  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonicalTag(url: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setHreflangTags(canonicalPath: string) {
  if (typeof document === 'undefined') return;
  // Remove previous alternates
  document.querySelectorAll("link[rel='alternate'][hreflang]").forEach((el) => el.remove());

  const baseUrlWithoutQuery = canonicalPath.split('?')[0];

  SUPPORTED_LANGUAGES.forEach((lang) => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', lang);
    link.setAttribute('href', `${baseUrlWithoutQuery}?lang=${lang}`);
    document.head.appendChild(link);
  });

  // x-default points to base canonical without query
  const defaultLink = document.createElement('link');
  defaultLink.setAttribute('rel', 'alternate');
  defaultLink.setAttribute('hreflang', 'x-default');
  defaultLink.setAttribute('href', baseUrlWithoutQuery);
  document.head.appendChild(defaultLink);
}

function setJsonLdScript(data: Record<string, unknown> | Array<Record<string, unknown>>) {
  if (typeof document === 'undefined') return;
  const scriptId = 'eternal-structured-data';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function useSEO(props: SEOProps = {}) {
  const location = useLocation();
  const { currentLanguage } = useLanguageStore();

  const formattedTitle = useMemo(
    () => formatTitle(props.title, props.isRawTitle),
    [props.title, props.isRawTitle],
  );

  const canonicalUrl = useMemo(
    () => resolveCanonicalUrl(props.canonical || location.pathname, location.search),
    [props.canonical, location.pathname, location.search],
  );

  const rawImage = props.ogImage || props.image;
  const ogImageUrl = useMemo(() => {
    return getCdnUrl(rawImage, SEO_DEFAULT_OG_IMAGE);
  }, [rawImage]);

  const description = props.description || SEO_DEFAULT_DESCRIPTION;
  const keywords = Array.isArray(props.keywords)
    ? props.keywords.join(', ')
    : props.keywords || 'Eternal, Social Network, Messenger, Communities';
  const isNoIndex = props.noIndex || props.noindex;
  const robots = isNoIndex
    ? 'noindex, nofollow, noarchive'
    : props.robots ||
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const themeColor = props.themeColor || SEO_DEFAULT_THEME_COLOR;
  const ogType = (props.ogType || props.type || 'website') as OpenGraphType;
  const twitterCard = props.twitterCard || 'summary_large_image';

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 1. Set document title
    document.title = formattedTitle;

    const langMap: Record<SupportedLanguage, string> = {
      English: 'en',
      'English (UK)': 'en-GB',
      Українська: 'uk',
      Deutsch: 'de',
      Français: 'fr',
      Español: 'es',
      Italiano: 'it',
      Magyar: 'hu',
      Nederlands: 'nl',
      Polski: 'pl',
      'Português (Brasil)': 'pt-BR',
      Türkçe: 'tr',
      日本語: 'ja',
      한국어: 'ko',
      繁體中文: 'zh-TW',
      简体中文: 'zh-CN',
    };
    const langCode = langMap[currentLanguage] || 'en';
    document.documentElement.lang = langCode;

    // 3. Standard Meta Tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    setMetaTag('robots', robots);
    setMetaTag('theme-color', themeColor);

    // 4. OpenGraph Tags (for Discord, Telegram, Instagram, Facebook previews)
    setMetaTag('og:site_name', SEO_SITE_NAME, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:title', formattedTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', ogImageUrl, true);
    setMetaTag('og:image:secure_url', ogImageUrl, true);
    setMetaTag('og:image:type', ogImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg', true);
    setMetaTag('og:image:width', '1200', true);
    setMetaTag('og:image:height', '630', true);
    setMetaTag('og:image:alt', props.ogImageAlt || formattedTitle, true);
    setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:locale', langCode === 'ru' ? 'ru_RU' : 'en_US', true);

    // 5. Twitter Card Tags (for Discord and Twitter/X rich summary cards)
    setMetaTag('twitter:card', twitterCard);
    setMetaTag('twitter:title', formattedTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImageUrl);
    setMetaTag('twitter:image:alt', props.ogImageAlt || formattedTitle);
    setMetaTag('twitter:site', SEO_TWITTER_HANDLE);
    setMetaTag('twitter:creator', SEO_TWITTER_HANDLE);

    // 6. Self-referencing Canonical URL
    setCanonicalTag(canonicalUrl);

    // 7. Multi-language hreflang alternates
    if (props.alternateLanguages && props.alternateLanguages.length > 0) {
      document.querySelectorAll("link[rel='alternate'][hreflang]").forEach((el) => el.remove());
      props.alternateLanguages.forEach((alt) => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', alt.lang);
        link.setAttribute('href', alt.url);
        document.head.appendChild(link);
      });
    } else {
      setHreflangTags(canonicalUrl);
    }

    // 8. Schema.org JSON-LD Structured Data
    const jsonLdData: Record<string, unknown>[] = [
      generateOrganizationSchema(),
      generateWebSiteSchema(),
    ];

    if (props.structuredData) {
      const { type, breadcrumbs, faqs, article, person, customJsonLd } = props.structuredData;

      if (breadcrumbs && breadcrumbs.length > 0) {
        const bc = generateBreadcrumbSchema(breadcrumbs);
        if (bc) jsonLdData.push(bc);
      }

      if (faqs && faqs.length > 0) {
        const faqSchema = generateFAQSchema(faqs);
        if (faqSchema) jsonLdData.push(faqSchema);
      }

      if (article) {
        jsonLdData.push(generateArticleSchema(article));
      }

      if (person) {
        jsonLdData.push(generateProfileSchema(person));
      }

      if (type === 'SoftwareApplication') {
        jsonLdData.push(generateSoftwareAppSchema());
      }

      if (customJsonLd) {
        if (Array.isArray(customJsonLd)) {
          jsonLdData.push(...customJsonLd);
        } else {
          jsonLdData.push(customJsonLd);
        }
      }
    }

    setJsonLdScript(jsonLdData);
  }, [
    formattedTitle,
    canonicalUrl,
    description,
    keywords,
    robots,
    themeColor,
    ogType,
    ogImageUrl,
    twitterCard,
    props.ogImageAlt,
    props.alternateLanguages,
    props.structuredData,
    currentLanguage,
  ]);
}
