import type { BlogPost, CreatorArticle } from '@social-network/shared-content';
import type * as SharedContent from '@social-network/shared-content';
import { sentenceCase, type ContentLanguage } from '../../legal/model/documents';

export interface CardDetails {
  overview?: string;
  lists: { title: string; items: string[] }[];
}

export interface ContentCard {
  id: string;
  eyebrow?: string;
  title: string;
  text: string;
  meta?: string[];
  details?: CardDetails;
  link?: string;
}

export type ContentBlock =
  | { kind: 'cards'; title?: string; intro?: string; items: ContentCard[] }
  | { kind: 'faq'; title?: string; intro?: string; items: { question: string; answer: string }[] }
  | { kind: 'text'; title?: string; paragraphs: string[] }
  | { kind: 'quote'; quote: string; author: string; role?: string }
  | {
      kind: 'timeline';
      title?: string;
      intro?: string;
      items: { date: string; title: string; text: string; badge?: string }[];
    }
  | {
      kind: 'swatches';
      title?: string;
      intro?: string;
      items: { name: string; hex: string; text: string }[];
    }
  | {
      kind: 'dosDonts';
      title?: string;
      intro?: string;
      dos: { title: string; items: string[] };
      donts: { title: string; items: string[] };
    }
  | {
      kind: 'links';
      title?: string;
      intro?: string;
      items: { label: string; text?: string; path: string }[];
    }
  | { kind: 'cta'; title: string; text: string; label: string; path: string };

export interface ContentPage {
  title: string;
  lead: string;
  blocks: ContentBlock[];
}

export type ContentPageId =
  | 'company'
  | 'about'
  | 'blog'
  | 'blog-community'
  | 'blog-company'
  | 'blog-engineering'
  | 'blog-how-to'
  | 'blog-product'
  | 'blog-safety'
  | 'newsroom'
  | 'careers'
  | 'creators'
  | 'brand'
  | 'download'
  | 'safety-library'
  | 'privacy-hub'
  | 'family-center'
  | 'transparency'
  | 'safety-news'
  | 'policy-hub'
  | 'teen-charter'
  | 'wellbeing';

const byName = <T>(record: Record<string, T>, lang: ContentLanguage): T => {
  const value = record[lang === 'uk' ? 'Українська' : 'English'] ?? record.English;
  if (!value) throw new Error('Missing English content');
  return value;
};

const caps = (value: string) => sentenceCase(value);

const postCard = (post: BlogPost): ContentCard => ({
  id: post.id,
  eyebrow: post.category,
  title: caps(post.title),
  text: post.subtitle ? `${post.subtitle} ${post.description}` : post.description,
  meta: [post.date, post.readTime, ...(post.author ? [post.author] : [])],
});

const uniqueCards = (cards: ContentCard[]) => {
  const seen = new Set<string>();
  return cards.filter((card) => !seen.has(card.id) && seen.add(card.id));
};

const BLOG_CATEGORIES = [
  { id: 'blog-community', data: 'COMMUNITY_TRANSLATIONS', path: '/category/community' },
  { id: 'blog-company', data: 'COMPANY_BLOG_TRANSLATIONS', path: '/category/company' },
  { id: 'blog-engineering', data: 'ENGINEERING_BLOG_TRANSLATIONS', path: '/category/engineering' },
  { id: 'blog-how-to', data: 'HOW_TO_ETERNAL_BLOG_TRANSLATIONS', path: '/category/how-to-eternal' },
  { id: 'blog-product', data: 'PRODUCT_BLOG_TRANSLATIONS', path: '/category/product' },
  { id: 'blog-safety', data: 'SAFETY_BLOG_TRANSLATIONS', path: '/category/safety' },
] as const;

const creatorCard = (
  article: Pick<
    CreatorArticle,
    'id' | 'categoryLabel' | 'title' | 'description' | 'readTime' | 'badge' | 'details'
  >,
  labels: { keyTakeawaysTitle: string; actionStepsTitle: string },
): ContentCard => ({
  id: article.id,
  eyebrow: article.categoryLabel,
  title: article.title,
  text: article.description,
  meta: [article.readTime, ...(article.badge ? [article.badge] : [])],
  details: {
    overview: article.details.overview,
    lists: [
      { title: labels.keyTakeawaysTitle, items: article.details.keyTakeaways },
      { title: labels.actionStepsTitle, items: article.details.actionItems },
    ],
  },
});

const companyLinks: Record<ContentLanguage, { label: string; text: string; path: string }[]> = {
  en: [
    { label: 'About Eternal', text: 'Our story and where we are heading', path: '/about' },
    { label: 'Blog', text: 'Product news, engineering and community stories', path: '/blog' },
    { label: 'Newsroom', text: 'Press releases and media resources', path: '/newsroom' },
    { label: 'Careers', text: 'Open roles and life on the team', path: '/careers' },
    { label: 'Creators', text: 'Guides for growing a community', path: '/creators' },
    { label: 'Brand', text: 'Logos, colors and usage rules', path: '/branding' },
    { label: 'Download', text: 'Get Eternal on your devices', path: '/download' },
  ],
  uk: [
    { label: 'Про Eternal', text: 'Наша історія та плани', path: '/about' },
    { label: 'Блог', text: 'Новини продукту, інженерія та історії спільноти', path: '/blog' },
    { label: 'Пресцентр', text: 'Пресрелізи та матеріали для медіа', path: '/newsroom' },
    { label: 'Кар’єра', text: 'Відкриті вакансії та життя команди', path: '/careers' },
    { label: 'Креаторам', text: 'Посібники зі створення спільноти', path: '/creators' },
    { label: 'Бренд', text: 'Логотипи, кольори та правила використання', path: '/branding' },
    { label: 'Завантажити', text: 'Eternal на ваших пристроях', path: '/download' },
  ],
};

const companyTitle: Record<ContentLanguage, { title: string; lead: string }> = {
  en: { title: 'About Eternal', lead: 'Company, press, careers and brand resources.' },
  uk: { title: 'Про Eternal', lead: 'Компанія, преса, кар’єра та ресурси бренду.' },
};

type Shared = typeof SharedContent;
type Loader = (lang: ContentLanguage, c: Shared) => ContentPage;

const LOADERS: Record<ContentPageId, Loader> = {
  company: (lang, c) => ({
    ...companyTitle[lang],
    blocks: [{ kind: 'links', items: companyLinks[lang] }],
  }),
  about: (lang, c) => {
    const t = byName(c.ABOUT_TRANSLATIONS, lang);
    return {
      title: caps(t.title),
      lead: t.subtitle,
      blocks: [
        {
          kind: 'timeline',
          title: t.storyTitle,
          intro: t.storySubtitle,
          items: t.milestones.map((m) => ({
            date: m.date,
            title: m.title,
            text: m.description,
            badge: m.badge,
          })),
        },
        {
          kind: 'cta',
          title: t.futureHeading,
          text: t.futureDescription,
          label: t.joinButton,
          path: '/careers',
        },
      ],
    };
  },
  blog: (lang, c) => {
    const t = byName(c.BLOG_TRANSLATIONS, lang);
    return {
      title: caps(t.heroHeading),
      lead: t.exploreFurtherSubtitle,
      blocks: [
        {
          kind: 'cards',
          title: t.featuredCategory,
          items: uniqueCards([t.heroArticle, ...t.featuredPosts].map(postCard)),
        },
        {
          kind: 'links',
          items: BLOG_CATEGORIES.map((category) => {
            const data = byName(c[category.data], lang);
            return { label: data.categoryName, text: data.subtitle, path: category.path };
          }),
        },
        {
          kind: 'cards',
          title: t.exploreFurtherHeading,
          items: uniqueCards(t.explorePosts.map(postCard)),
        },
      ],
    };
  },
  ...(Object.fromEntries(
    BLOG_CATEGORIES.map((category) => [
      category.id,
      (lang: ContentLanguage, c: Shared): ContentPage => {
        const data = byName(c[category.data], lang);
        return {
          title: caps(data.title),
          lead: data.subtitle,
          blocks: [
            {
              kind: 'cards',
              items: uniqueCards(
                [data.heroArticle, ...data.featuredPosts, ...data.explorePosts].map(postCard),
              ),
            },
          ],
        };
      },
    ]),
  ) as Record<(typeof BLOG_CATEGORIES)[number]['id'], Loader>),
  newsroom: (lang, c) => {
    const t = byName(c.NEWSROOM_TRANSLATIONS, lang);
    return {
      title: caps(t.heroTitle),
      lead: t.heroSubtitle,
      blocks: [
        {
          kind: 'cards',
          title: t.pressReleasesHeading,
          items: t.pressReleases.map((item) => ({
            id: item.id,
            eyebrow: item.tag,
            title: item.title,
            text: item.description,
            meta: [item.date],
          })),
        },
        {
          kind: 'cards',
          title: t.blogHeading,
          items: t.blogUpdates.map((item) => ({
            id: item.id,
            eyebrow: item.category,
            title: item.title,
            text: item.description,
          })),
        },
        {
          kind: 'cta',
          title: t.brandKitHeading,
          text: t.brandKitSubtitle,
          label: t.brandKitButton,
          path: '/branding',
        },
        { kind: 'text', title: t.contactHeading, paragraphs: [t.contactSubtitle] },
      ],
    };
  },
  careers: (lang, c) => {
    const t = byName(c.CAREERS_TRANSLATIONS, lang);
    return {
      title: caps(t.heroTitle),
      lead: t.heroSubtitle,
      blocks: [
        {
          kind: 'cards',
          title: t.allJobsHeading,
          intro: t.allJobsSubtitle,
          items: t.jobs.map((job) => ({
            id: job.id,
            eyebrow: job.department,
            title: job.title,
            text: job.targetAudience,
            meta: [job.location, job.type],
            details: {
              lists: [
                { title: t.tasksLabel, items: job.responsibilities },
                { title: t.requirementsLabel, items: job.requirements },
                { title: t.benefitsLabel, items: job.benefits },
              ],
            },
          })),
        },
        {
          kind: 'cards',
          title: t.experienceHeading,
          intro: t.experienceSubtitle,
          items: t.perks.map((perk) => ({
            id: perk.id,
            eyebrow: perk.badge,
            title: perk.title,
            text: perk.desc,
          })),
        },
        { kind: 'faq', title: t.faqHeading, intro: t.faqSubtitle, items: t.faqItems },
      ],
    };
  },
  creators: (lang, c) => {
    const t = lang === 'uk' ? c.CREATORS_DATA_UK : c.CREATORS_DATA_EN;
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'cards',
          title: t.featuredSection.title,
          intro: t.featuredSection.subtitle,
          items: t.featuredGuides.map((guide) => creatorCard(guide, t.modal)),
        },
        {
          kind: 'cards',
          title: t.exploreSection.title,
          intro: t.exploreSection.subtitle,
          items: t.articles.map((article) => creatorCard(article, t.modal)),
        },
      ],
    };
  },
  brand: (lang, c) => {
    const t = byName(c.BRANDING_TRANSLATIONS, lang);
    return {
      title: caps(t.heroTitle),
      lead: t.heroSubtitle,
      blocks: [
        {
          kind: 'swatches',
          title: t.colorsHeading,
          intro: t.colorsSubtitle,
          items: t.swatches.map((swatch) => ({
            name: swatch.name,
            hex: swatch.hex,
            text: swatch.description,
          })),
        },
        { kind: 'text', title: t.logoHeading, paragraphs: [t.logoSubtitle, t.clearspaceSubtitle] },
        {
          kind: 'dosDonts',
          title: t.legalHeading,
          intro: t.legalIntro,
          dos: { title: t.dosTitle, items: t.dosItems },
          donts: { title: t.dontsTitle, items: t.dontsItems },
        },
        {
          kind: 'cta',
          title: t.needMoreTitle,
          text: t.needMoreSubtitle,
          label: t.viewBrandKit,
          path: '/branding',
        },
      ],
    };
  },
  download: (lang, c) => {
    const t = byName(c.DOWNLOAD_TRANSLATIONS, lang);
    return {
      title: caps(t.heroTitle),
      lead: t.heroSubtitle,
      blocks: [
        { kind: 'text', title: t.mobileSectionHeading, paragraphs: [t.mobileSectionSubtitle] },
        {
          kind: 'text',
          title: t.desktopSectionHeading,
          paragraphs: [t.desktopSectionSubtitle, t.nativeUnavailable],
        },
        { kind: 'cta', title: t.openWebApp, text: t.previewLabel, label: t.openWebApp, path: '/' },
      ],
    };
  },
  'safety-library': (lang, c) => {
    const t = lang === 'uk' ? c.SAFETY_LIBRARY_UK : c.SAFETY_LIBRARY_EN;
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'cards',
          items: c.ARTICLES_DATA.map((article) => ({
            id: article.id,
            eyebrow: t.filters.categories[article.category] ?? article.category,
            title: article.title,
            text: article.summary,
            meta: [article.date, article.readTime],
          })),
        },
      ],
    };
  },
  'privacy-hub': (lang, c) => {
    const t = c.PRIVACY_HUB_DATA[lang];
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'cards',
          title: t.principlesSection.title,
          intro: t.principlesSection.subtitle,
          items: t.principlesSection.items.map((item) => ({
            id: item.id,
            title: item.title,
            text: item.description,
          })),
        },
        {
          kind: 'text',
          title: t.productsSection.title,
          paragraphs: [t.productsSection.description, ...t.productsSection.modalPoints],
        },
        {
          kind: 'links',
          title: t.policiesSection.title,
          intro: t.policiesSection.subtitle,
          items: t.policiesSection.items.map((item) => ({
            label: item.title,
            ...(item.badge ? { text: item.badge } : {}),
            path: item.href,
          })),
        },
      ],
    };
  },
  'family-center': (lang, c) => {
    const t = lang === 'uk' ? c.FAMILY_CENTER_UK : c.FAMILY_CENTER_EN;
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'text',
          title: t.parentsSection.heading,
          paragraphs: [t.parentsSection.p1, t.parentsSection.p2, t.parentsSection.p3],
        },
        {
          kind: 'quote',
          quote: t.quoteCard.quote,
          author: t.quoteCard.author,
          role: `${t.quoteCard.role}, ${t.quoteCard.organization}`,
        },
        {
          kind: 'text',
          title: t.teensSection.heading,
          paragraphs: [t.teensSection.p1, t.teensSection.p2],
        },
        {
          kind: 'cards',
          title: t.safetyApproach.heading,
          items: [
            { id: 'card1', ...t.safetyApproach.card1, text: t.safetyApproach.card1.description },
            { id: 'card2', ...t.safetyApproach.card2, text: t.safetyApproach.card2.description },
          ],
        },
        { kind: 'faq', title: `${t.faq.heading}: ${t.faq.parentsTab}`, items: t.faq.parentsFaqs },
        { kind: 'faq', title: `${t.faq.heading}: ${t.faq.teensTab}`, items: t.faq.teensFaqs },
        { kind: 'text', title: t.helpSection.heading, paragraphs: [t.helpSection.description] },
      ],
    };
  },
  transparency: (lang, c) => {
    const t = c.TRANSPARENCY_HUB_DATA[lang];
    const report = (item: (typeof t.reportsSection.reports)[number]) => ({
      id: item.id,
      eyebrow: item.year,
      title: item.title,
      text: item.period,
    });
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'cards',
          title: t.reportsSection.title,
          intro: t.reportsSection.description,
          items: t.reportsSection.reports.map(report),
        },
        {
          kind: 'cards',
          title: t.dsaSection.title,
          intro: t.dsaSection.description,
          items: t.dsaSection.reports.map(report),
        },
        {
          kind: 'cards',
          title: t.actionSection.title,
          intro: t.actionSection.subtitle,
          items: t.actionSection.articles.map((article) => ({
            id: article.id,
            eyebrow: article.category,
            title: article.title,
            text: article.description,
            meta: [article.date, article.readTime],
            link: article.href,
          })),
        },
      ],
    };
  },
  'safety-news': (lang, c) => {
    const t = c.SAFETY_NEWS_DATA[lang];
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'cards',
          items: t.articles.map((article) => ({
            id: article.id,
            eyebrow: article.category,
            title: article.title,
            text: article.description,
            meta: [article.date, article.readTime],
            link: article.href,
          })),
        },
      ],
    };
  },
  'policy-hub': (lang, c) => {
    const t = lang === 'uk' ? c.POLICY_HUB_UK : c.POLICY_HUB_EN;
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'cta',
          title: t.hero.ctaButton,
          text: '',
          label: t.hero.ctaButton,
          path: t.hero.ctaLink,
        },
        {
          kind: 'cards',
          title: t.explainersSection.title,
          intro: t.explainersSection.subtitle,
          items: t.items.map((item) => ({
            id: item.id,
            eyebrow: item.categoryLabel,
            title: item.title,
            text: item.summary,
            details: {
              lists: [{ title: t.explainersSection.keyTakeawaysTitle, items: item.details }],
            },
          })),
        },
      ],
    };
  },
  'teen-charter': (lang, c) => {
    const t = lang === 'uk' ? c.TEEN_CHARTER_UK : c.TEEN_CHARTER_EN;
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'text',
          title: t.introSection.heading,
          paragraphs: [
            t.introSection.paragraph1,
            t.introSection.paragraph2,
            t.introSection.paragraph3,
          ],
        },
        {
          kind: 'cards',
          title: t.charterSection.title,
          intro: t.charterSection.subtitle,
          items: t.charterSection.pillars.map((pillar) => ({
            id: pillar.id,
            eyebrow: pillar.badge,
            title: pillar.title,
            text: pillar.description,
          })),
        },
        {
          kind: 'cards',
          title: t.villageSection.title,
          intro: t.villageSection.description,
          items: [
            {
              id: 'point1',
              title: t.villageSection.point1.title,
              text: t.villageSection.point1.text,
            },
            {
              id: 'point2',
              title: t.villageSection.point2.title,
              text: t.villageSection.point2.text,
            },
          ],
        },
        {
          kind: 'faq',
          title: t.quizSection.title,
          intro: t.quizSection.subtitle,
          items: t.quizSection.scenarios.map((scenario) => ({
            question: scenario.question,
            answer: `${scenario.correctAnswer === 'acceptable' ? t.quizSection.acceptableBtn : t.quizSection.unacceptableBtn}. ${scenario.explanation.reason}`,
          })),
        },
        {
          kind: 'cards',
          items: t.partnersSection.slides.map((slide) => ({
            id: slide.id,
            eyebrow: slide.subname,
            title: slide.name,
            text: slide.description,
            ...(slide.linkUrl ? { link: slide.linkUrl } : {}),
          })),
        },
      ],
    };
  },
  wellbeing: (lang, c) => {
    const t = lang === 'uk' ? c.WELLBEING_HUB_UK : c.WELLBEING_HUB_EN;
    return {
      title: caps(t.hero.title),
      lead: t.hero.subtitle,
      blocks: [
        {
          kind: 'cards',
          title: t.resourcesSection.title,
          intro: t.resourcesSection.subtitle,
          items: t.resourcesSection.resources.map((resource) => ({
            id: resource.id,
            eyebrow: resource.badgeText,
            title: resource.title,
            text: resource.description,
            ...(resource.linkUrl ? { link: resource.linkUrl } : {}),
          })),
        },
        {
          kind: 'cards',
          title: t.principlesSection.title,
          intro: t.principlesSection.subtitle,
          items: t.principlesSection.principles.map((principle) => ({
            id: principle.id,
            title: principle.title,
            text: principle.description,
          })),
        },
        {
          kind: 'faq',
          title: t.globalSupportModal.title,
          intro: t.globalSupportModal.subtitle,
          items: t.globalSupportModal.regions.map((region) => ({
            question: region.region,
            answer: region.services
              .map((service) => `${service.name} — ${service.contact}. ${service.desc}`)
              .join('\n\n'),
          })),
        },
        {
          kind: 'quote',
          quote: t.quoteSection.quote,
          author: t.quoteSection.author,
          role: t.quoteSection.authorRole,
        },
        {
          kind: 'cards',
          title: t.moreResourcesSection.title,
          items: t.moreResourcesSection.articles.map((article) => ({
            id: article.id,
            eyebrow: article.category,
            title: article.title,
            text: article.summary,
          })),
        },
        {
          kind: 'links',
          items: [
            {
              label: t.parentHubSection.heading,
              text: t.parentHubSection.description,
              path: t.parentHubSection.link,
            },
            {
              label: t.teenCharterSection.heading,
              text: t.teenCharterSection.description,
              path: t.teenCharterSection.link,
            },
          ],
        },
      ],
    };
  },
};

const SOURCES = {
  'blog/blogData': () => import('@social-network/shared-content/src/blog/blogData'),
  'blog/communityData': () => import('@social-network/shared-content/src/blog/communityData'),
  'blog/companyBlogData': () => import('@social-network/shared-content/src/blog/companyBlogData'),
  'blog/engineeringBlogData': () =>
    import('@social-network/shared-content/src/blog/engineeringBlogData'),
  'blog/howToEternalBlogData': () =>
    import('@social-network/shared-content/src/blog/howToEternalBlogData'),
  'blog/productBlogData': () => import('@social-network/shared-content/src/blog/productBlogData'),
  'blog/safetyBlogData': () => import('@social-network/shared-content/src/blog/safetyBlogData'),
  'company/aboutTranslations': () =>
    import('@social-network/shared-content/src/company/aboutTranslations'),
  'company/brandingData': () => import('@social-network/shared-content/src/company/brandingData'),
  'company/careersData': () => import('@social-network/shared-content/src/company/careersData'),
  'company/creatorsData': () => import('@social-network/shared-content/src/company/creatorsData'),
  'company/downloadData': () => import('@social-network/shared-content/src/company/downloadData'),
  'company/newsroomData': () => import('@social-network/shared-content/src/company/newsroomData'),
  'safety/familyCenterData': () =>
    import('@social-network/shared-content/src/safety/familyCenterData'),
  'safety/policyHubData': () => import('@social-network/shared-content/src/safety/policyHubData'),
  'safety/privacyHubData': () => import('@social-network/shared-content/src/safety/privacyHubData'),
  'safety/safetyLibraryData': () =>
    import('@social-network/shared-content/src/safety/safetyLibraryData'),
  'safety/safetyNewsData': () => import('@social-network/shared-content/src/safety/safetyNewsData'),
  'safety/teenCharterData': () =>
    import('@social-network/shared-content/src/safety/teenCharterData'),
  'safety/transparencyHubData': () =>
    import('@social-network/shared-content/src/safety/transparencyHubData'),
  'safety/wellbeingHubData': () =>
    import('@social-network/shared-content/src/safety/wellbeingHubData'),
} satisfies Record<string, () => Promise<Partial<Shared>>>;

type Source = keyof typeof SOURCES;

const PAGE_SOURCES: Record<ContentPageId, readonly Source[]> = {
  company: [],
  about: ['company/aboutTranslations'],
  blog: [
    'blog/blogData',
    'blog/communityData',
    'blog/companyBlogData',
    'blog/engineeringBlogData',
    'blog/howToEternalBlogData',
    'blog/productBlogData',
    'blog/safetyBlogData',
  ],
  'blog-community': ['blog/communityData'],
  'blog-company': ['blog/companyBlogData'],
  'blog-engineering': ['blog/engineeringBlogData'],
  'blog-how-to': ['blog/howToEternalBlogData'],
  'blog-product': ['blog/productBlogData'],
  'blog-safety': ['blog/safetyBlogData'],
  newsroom: ['company/newsroomData'],
  careers: ['company/careersData'],
  creators: ['company/creatorsData'],
  brand: ['company/brandingData'],
  download: ['company/downloadData'],
  'safety-library': ['safety/safetyLibraryData'],
  'privacy-hub': ['safety/privacyHubData'],
  'family-center': ['safety/familyCenterData'],
  transparency: ['safety/transparencyHubData'],
  'safety-news': ['safety/safetyNewsData'],
  'policy-hub': ['safety/policyHubData'],
  'teen-charter': ['safety/teenCharterData'],
  wellbeing: ['safety/wellbeingHubData'],
};

export const CONTENT_PAGE_IDS = Object.keys(LOADERS) as ContentPageId[];

function normalizeBlock(block: ContentBlock): ContentBlock {
  const titled = 'title' in block && block.title ? { ...block, title: caps(block.title) } : block;
  switch (titled.kind) {
    case 'cards':
      return {
        ...titled,
        items: titled.items.map((card) => ({
          ...card,
          title: caps(card.title),
          ...(card.eyebrow ? { eyebrow: caps(card.eyebrow) } : {}),
        })),
      };
    case 'links':
      return {
        ...titled,
        items: titled.items.map((item) => ({ ...item, label: caps(item.label) })),
      };
    case 'cta':
      return { ...titled, label: caps(titled.label) };
    default:
      return titled;
  }
}

export async function loadContentPage(
  id: ContentPageId,
  lang: ContentLanguage,
): Promise<ContentPage> {
  const modules = await Promise.all(PAGE_SOURCES[id].map((source) => SOURCES[source]()));
  const page = LOADERS[id](lang, Object.assign({}, ...modules) as Shared);
  return {
    ...page,
    blocks: page.blocks
      .filter((block) => !('items' in block) || block.items.length > 0)
      .map(normalizeBlock),
  };
}

export const CONTENT_PATHS: Record<ContentPageId, string[]> = {
  company: ['/company'],
  about: ['/about'],
  blog: ['/blog'],
  'blog-community': ['/category/community'],
  'blog-company': ['/category/company'],
  'blog-engineering': ['/category/engineering'],
  'blog-how-to': ['/category/how-to-eternal', '/category/howto', '/category/howtoeternal'],
  'blog-product': ['/category/product', '/category/productfeatures', '/category/product-features'],
  'blog-safety': ['/category/safety', '/category/policy', '/category/policy-safety'],
  newsroom: ['/newsroom'],
  careers: ['/careers', '/jobs'],
  creators: ['/creators'],
  brand: ['/branding', '/brand'],
  download: ['/download'],
  'safety-library': ['/safety-library', '/safety/library'],
  'privacy-hub': ['/safety-privacy', '/safety/privacy'],
  'family-center': ['/safety-family-center', '/safety/family-center'],
  transparency: ['/safety-transparency', '/safety/transparency', '/transparency'],
  'safety-news': ['/safety-news', '/safety/news'],
  'policy-hub': ['/safety-policies', '/safety/policies', '/policies'],
  'teen-charter': ['/safety-teen-charter', '/safety/teen-charter', '/teen-charter'],
  wellbeing: ['/safety-wellbeing', '/safety/wellbeing', '/wellbeing'],
};
