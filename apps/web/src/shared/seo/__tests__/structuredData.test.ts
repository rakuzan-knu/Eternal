import { describe, expect, it } from 'vitest';
import {
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateArticleSchema,
  generateProfileSchema,
  generateSoftwareAppSchema,
} from '../structuredData';
import { SEO_BASE_URL, SEO_SITE_NAME, SAME_AS_ENTITIES } from '../seoConfig';

describe('Structured Data (Schema.org JSON-LD)', () => {
  it('generates valid WebSite schema with Sitelinks searchbox', () => {
    const schema = generateWebSiteSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebSite');
    expect(schema.name).toBe(SEO_SITE_NAME);
    expect(schema.url).toBe(SEO_BASE_URL);
    expect(schema.potentialAction['@type']).toBe('SearchAction');
    expect(schema.potentialAction.target.urlTemplate).toContain('/search?q=');
  });

  it('generates valid Organization schema with Knowledge Graph sameAs entities', () => {
    const schema = generateOrganizationSchema();
    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe(SEO_SITE_NAME);
    expect(schema.sameAs).toEqual(SAME_AS_ENTITIES);
    expect(schema.alternateName).toContain('Eternal Social Network');
  });

  it('generates BreadcrumbList schema with root Home and hierarchy', () => {
    const breadcrumbs = [
      { name: 'Safety', url: '/safety' },
      { name: 'Transparency Hub', url: '/safety/transparency' },
    ];
    const schema = generateBreadcrumbSchema(breadcrumbs);
    expect(schema).not.toBeNull();
    expect(schema!['@type']).toBe('BreadcrumbList');
    expect(schema!.itemListElement).toHaveLength(3);
    expect(schema!.itemListElement[0].name).toBe('Home');
    expect(schema!.itemListElement[1].name).toBe('Safety');
    expect(schema!.itemListElement[2].name).toBe('Transparency Hub');
    expect(schema!.itemListElement[2].item).toBe(`${SEO_BASE_URL}/safety/transparency`);
  });

  it('generates FAQPage schema with questions and accepted answers', () => {
    const faqs = [
      { question: 'Is Eternal free to use?', answer: 'Yes, Eternal is completely free.' },
      {
        question: 'Does Eternal sell user data?',
        answer: 'No, Eternal has a zero-data-selling pledge.',
      },
    ];
    const schema = generateFAQSchema(faqs);
    expect(schema).not.toBeNull();
    expect(schema!['@type']).toBe('FAQPage');
    expect(schema!.mainEntity).toHaveLength(2);
    expect(schema!.mainEntity[0].name).toBe('Is Eternal free to use?');
    expect(schema!.mainEntity[0].acceptedAnswer.text).toBe('Yes, Eternal is completely free.');
  });

  it('generates NewsArticle / BlogPosting schema with headline and author', () => {
    const schema = generateArticleSchema({
      title: 'Eternal 2.0 Released',
      description: 'Major redesign and features release.',
      url: '/blog/eternal-2-released',
      authorName: 'Alex Rivera',
    });
    expect(schema['@type']).toBe('NewsArticle');
    expect(schema.headline).toBe('Eternal 2.0 Released');
    expect(schema.author.name).toBe('Alex Rivera');
    expect(schema.mainEntityOfPage['@id']).toBe(`${SEO_BASE_URL}/blog/eternal-2-released`);
  });

  it('generates ProfilePage & Person schema for public user profiles', () => {
    const schema = generateProfileSchema({
      username: 'durov',
      displayName: 'Pavel Durov',
      bio: 'Building privacy-first communication.',
      avatarUrl: 'https://eternalnet.vercel.app/images/durov.jpg',
    });
    expect(schema['@type']).toBe('ProfilePage');
    expect(schema.mainEntity['@type']).toBe('Person');
    expect(schema.mainEntity.name).toBe('Pavel Durov');
    expect(schema.mainEntity.identifier).toBe('durov');
    expect(schema.mainEntity.url).toBe(`${SEO_BASE_URL}/@durov`);
  });

  it('generates SoftwareApplication schema for download page', () => {
    const schema = generateSoftwareAppSchema();
    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.name).toBe('Eternal');
    expect(schema.downloadUrl).toBe(`${SEO_BASE_URL}/download`);
  });
});
