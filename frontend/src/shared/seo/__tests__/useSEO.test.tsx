import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SEOHead } from '../SEOHead';
import { SEO_SITE_NAME, SEO_BASE_URL } from '../seoConfig';

describe('useSEO & SEOHead', () => {
  beforeEach(() => {
    document.title = '';
    document.head.innerHTML = '';
  });

  it('updates document.title and standard meta tags', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <SEOHead
          title="About Eternal"
          description="Learn about our story and mission."
          keywords="Eternal, Story, Mission"
        />
      </MemoryRouter>,
    );

    expect(document.title).toBe(`About Eternal • ${SEO_SITE_NAME}`);

    const descMeta = document.querySelector("meta[name='description']");
    expect(descMeta?.getAttribute('content')).toBe('Learn about our story and mission.');

    const keywordsMeta = document.querySelector("meta[name='keywords']");
    expect(keywordsMeta?.getAttribute('content')).toBe('Eternal, Story, Mission');
  });

  it('sets self-referencing canonical URL and symmetric hreflang links', () => {
    render(
      <MemoryRouter initialEntries={['/privacy?lang=ru']}>
        <SEOHead title="Privacy Policy" canonical="/privacy" />
      </MemoryRouter>,
    );

    const canonical = document.querySelector("link[rel='canonical']");
    expect(canonical?.getAttribute('href')).toBe(`${SEO_BASE_URL}/privacy?lang=ru`);

    const ruAlternate = document.querySelector("link[rel='alternate'][hreflang='ru']");
    expect(ruAlternate?.getAttribute('href')).toBe(`${SEO_BASE_URL}/privacy?lang=ru`);

    const enAlternate = document.querySelector("link[rel='alternate'][hreflang='en']");
    expect(enAlternate?.getAttribute('href')).toBe(`${SEO_BASE_URL}/privacy?lang=en`);

    const xDefault = document.querySelector("link[rel='alternate'][hreflang='x-default']");
    expect(xDefault?.getAttribute('href')).toBe(`${SEO_BASE_URL}/privacy`);
  });

  it('sets OpenGraph and Twitter Card meta tags for Discord/Telegram previews', () => {
    render(
      <MemoryRouter initialEntries={['/download']}>
        <SEOHead
          title="Download App"
          description="Get Eternal on iOS and Android."
          ogImage="/images/download-preview.png"
          twitterCard="summary_large_image"
        />
      </MemoryRouter>,
    );

    const ogTitle = document.querySelector("meta[property='og:title']");
    expect(ogTitle?.getAttribute('content')).toBe(`Download App • ${SEO_SITE_NAME}`);

    const ogImage = document.querySelector("meta[property='og:image']");
    expect(ogImage?.getAttribute('content')).toBe(`${SEO_BASE_URL}/images/download-preview.png`);

    const twitterCard = document.querySelector("meta[name='twitter:card']");
    expect(twitterCard?.getAttribute('content')).toBe('summary_large_image');
  });

  it('sets noindex, nofollow, noarchive on private routes', () => {
    render(
      <MemoryRouter initialEntries={['/messages']}>
        <SEOHead title="Direct Messages" noIndex={true} />
      </MemoryRouter>,
    );

    const robots = document.querySelector("meta[name='robots']");
    expect(robots?.getAttribute('content')).toBe('noindex, nofollow, noarchive');
  });

  it('injects JSON-LD script for structured data', () => {
    render(
      <MemoryRouter initialEntries={['/safety/library']}>
        <SEOHead
          title="Safety Library"
          structuredData={{
            breadcrumbs: [{ name: 'Safety', url: '/safety' }],
            faqs: [{ question: 'How to block?', answer: 'Click profile menu and tap block.' }],
          }}
        />
      </MemoryRouter>,
    );

    const script = document.getElementById('eternal-structured-data');
    expect(script).not.toBeNull();
    const parsed = JSON.parse(script?.textContent || '[]');
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((s: { '@type': string }) => s['@type'] === 'Organization')).toBe(true);
    expect(parsed.some((s: { '@type': string }) => s['@type'] === 'BreadcrumbList')).toBe(true);
    expect(parsed.some((s: { '@type': string }) => s['@type'] === 'FAQPage')).toBe(true);
  });
});
