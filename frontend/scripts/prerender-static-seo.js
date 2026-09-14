import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const INDEX_HTML_PATH = path.resolve(DIST_DIR, 'index.html');

const BASE_URL = process.env.VITE_SITE_URL || 'https://eternalnet.vercel.app';
const SITE_NAME = 'Eternal';

const STATIC_ROUTES = [
  {
    path: '/about',
    title: 'About Eternal • Our Story, Vision & Next-Gen Architecture',
    description:
      'Learn about Eternal, our mission to build a state-of-the-art social network, ultra-sleek messenger, and safe community ecosystem.',
    heading: 'About Eternal',
    bodyText:
      'Eternal is a high-performance, privacy-first social network and real-time messenger built for next-generation communities and creators.',
  },
  {
    path: '/company-information',
    title: 'Company Information & Impressum • Eternal',
    description:
      'Official corporate details, registration, headquarters, and legal representatives of Eternal Network.',
    heading: 'Company Information & Impressum',
    bodyText: 'Official legal information, company registration, and contact details for Eternal.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy • How Eternal Protects Your Personal Data',
    description:
      'Read the Eternal Privacy Policy. Learn about our end-to-end encryption, strict zero-data-selling pledge, and GDPR & CCPA privacy controls.',
    heading: 'Eternal Privacy Policy',
    bodyText:
      'Your privacy is our fundamental principle. We do not sell your personal data or messages.',
  },
  {
    path: '/terms',
    title: 'Terms of Service • User Agreement & Platform Rules',
    description:
      'Eternal Terms of Service. Understand your rights, community standards, content ownership, and account responsibilities.',
    heading: 'Terms of Service',
    bodyText: 'Platform rules, user rights, and community standards for using Eternal.',
  },
  {
    path: '/terms/cookie-policy',
    title: 'Cookie Policy & Tracking Technologies • Eternal',
    description:
      'Learn about our transparent cookie usage for essential security, authentication, and user preferences.',
    heading: 'Cookie Policy',
    bodyText: 'We only use cookies strictly necessary for authentication and platform security.',
  },
  {
    path: '/terms/regional-privacy',
    title: 'Regional Privacy Rights (GDPR, CCPA) • Eternal',
    description:
      'Detailed regional privacy rights for users in the European Union (GDPR), California (CCPA/CPRA), Brazil (LGPD), and worldwide.',
    heading: 'Regional Privacy Rights',
    bodyText: 'Specific statutory privacy rights under GDPR, CCPA/CPRA, and LGPD.',
  },
  {
    path: '/terms/retention-policy',
    title: 'Data Retention & Deletion Policy • Eternal',
    description:
      'Transparent breakdown of how long data is retained and how account deletion irreversibly removes all messages and media.',
    heading: 'Data Retention Policy',
    bodyText: 'Detailed data retention schedules and 30-day grace period for account deletion.',
  },
  {
    path: '/terms/data-privacy-controls',
    title: 'Data Privacy Controls & Settings Guide • Eternal',
    description:
      'Interactive guide to managing your privacy, two-factor authentication, device locks, and visibility on Eternal.',
    heading: 'Data Privacy Controls',
    bodyText: 'Take full control of your visibility, encryption keys, and session security.',
  },
  {
    path: '/terms/your-eternal-data-package',
    title: 'Your Eternal Data Package • Export & Portability Guide',
    description:
      'Download your full Eternal account archive, message history, posts, and media in machine-readable JSON & ZIP formats.',
    heading: 'Your Eternal Data Package',
    bodyText: 'Export and download your complete personal data archive at any time.',
  },
  {
    path: '/copyright',
    title: 'Copyright Policy, DMCA Notice & IP Protection • Eternal',
    description:
      'Eternal intellectual property guidelines, DMCA takedown procedures, and designated copyright agent information.',
    heading: 'Copyright & DMCA Policy',
    bodyText: 'Guidelines for copyright owners to report infringement and submit DMCA notices.',
  },
  {
    path: '/terms/paid-services',
    title: 'Paid Services, Premium Subscriptions & Refund Policy • Eternal',
    description:
      'Details on paid features, subscriber perks, payment processing, subscription management, and refund terms.',
    heading: 'Paid Services & Refund Policy',
    bodyText: 'Terms regarding subscriber perks, billing, renewals, and refunds.',
  },
  {
    path: '/terms/developer',
    title: 'Developer Terms of Service & API Platform Guidelines • Eternal',
    description:
      'Terms and policies for developers building bots, extensions, and integrations with Eternal APIs and Webhooks.',
    heading: 'Developer Terms of Service',
    bodyText: 'API access rules, bot rate limits, and security policies for developers.',
  },
  {
    path: '/terms/applicant-candidate-privacy-policy',
    title: 'Applicant & Candidate Recruitment Privacy Policy • Eternal',
    description:
      'How Eternal collects, stores, and protects personal data during job applications and hiring processes.',
    heading: 'Candidate Privacy Policy',
    bodyText: 'Data handling procedures for job applicants and candidates.',
  },
  {
    path: '/safety',
    title: 'Safety Center • Protecting Users, Youth & Communities',
    description:
      'Explore Eternal Safety Center. Our proactive safety tools, real-time moderation, family resources, and teen wellbeing protections.',
    heading: 'Eternal Safety Center',
    bodyText: 'Tools, guides, and policies dedicated to keeping our community safe.',
  },
  {
    path: '/safety/family-center',
    title: 'Family Center & Parental Guidance Hub • Eternal',
    description:
      'Supervision controls, screen time tools, and safety education resources for parents and guardians on Eternal.',
    heading: 'Family Center',
    bodyText: 'Parental supervision controls, advice, and resources for teen accounts.',
  },
  {
    path: '/safety/library',
    title: 'Safety Library • Guides, Tutorials & Anti-Bullying Resources • Eternal',
    description:
      'Comprehensive educational library for digital safety, scam prevention, harassment blocking, and healthy social habits.',
    heading: 'Safety Library',
    bodyText:
      'Educational guides covering harassment prevention, anti-doxxing, and account security.',
  },
  {
    path: '/safety/privacy',
    title: 'Privacy Hub & Security Protocols • Eternal',
    description:
      'Deep dive into Eternal cryptographic protocols, biometric device gates, and anti-surveillance infrastructure.',
    heading: 'Privacy Hub',
    bodyText: 'Technical overview of zero-knowledge architecture and device locks.',
  },
  {
    path: '/safety/transparency',
    title: 'Transparency Hub & Annual Audit Reports • Eternal',
    description:
      'Verified transparency reports covering moderation actions, government requests, and copyright enforcement metrics.',
    heading: 'Transparency Hub',
    bodyText: 'Annual and quarterly transparency audit reports.',
  },
  {
    path: '/safety/news',
    title: 'Safety News & Security Bulletins • Eternal',
    description:
      'Official announcements, security advisories, bug fixes, and safety feature rollouts across Eternal.',
    heading: 'Safety News',
    bodyText: 'Latest security advisories and platform updates.',
  },
  {
    path: '/safety/policies',
    title: 'Policy Hub • Platform Rules & Standards • Eternal',
    description:
      'Complete index of community policies, moderation standards, appeal procedures, and terms.',
    heading: 'Policy Hub',
    bodyText: 'Consolidated index of all platform rules, enforcement protocols, and appeals.',
  },
  {
    path: '/safety/teen-charter',
    title: 'Teen Charter & Youth Digital Rights Code • Eternal',
    description:
      'Our dedicated charter guaranteeing age-appropriate privacy defaults, anti-grooming protections, and night mode quiet hours for teens.',
    heading: 'Teen Charter',
    bodyText: 'Guaranteed protections and privacy defaults for younger users.',
  },
  {
    path: '/safety/wellbeing',
    title: 'Digital Wellbeing & Screen Time Management • Eternal',
    description:
      'Mindful scrolling alerts, break reminders, mute notifications, and wellness tools designed to prevent digital burnout.',
    heading: 'Digital Wellbeing',
    bodyText: 'Features designed to foster a healthy, balanced relationship with social media.',
  },
  {
    path: '/safety/law-enforcement',
    title: 'Law Enforcement Guidelines & Emergency Request Portal • Eternal',
    description:
      'Official procedures for verified legal authorities submitting subpoenas, court orders, and emergency disclosure requests.',
    heading: 'Law Enforcement Guidelines',
    bodyText: 'Legal request submission process and verification requirements.',
  },
  {
    path: '/careers',
    title: 'Careers at Eternal • Build the Future of Social',
    description:
      'Explore open engineering, design, and product roles at Eternal. Work on distributed systems, modern UI, and privacy-first social tech.',
    heading: 'Careers at Eternal',
    bodyText: 'Join our team to build next-generation social technologies and messaging apps.',
  },
  {
    path: '/brand',
    title: 'Brand Assets, Logos & Media Kit • Eternal',
    description:
      'Download official Eternal vector logos, brand guidelines, dark mode color tokens, and media press kits.',
    heading: 'Brand & Media Kit',
    bodyText: 'Official logos, badges, and brand guidelines for partners and press.',
  },
  {
    path: '/download',
    title: 'Download Eternal • Available for iOS, Android, macOS, Windows & Linux',
    description:
      'Get Eternal on all your devices. Ultra-fast native desktop and mobile apps with seamless real-time message sync.',
    heading: 'Download Eternal App',
    bodyText: 'Download Eternal across desktop, mobile, and web with unified synchronization.',
  },
  {
    path: '/creators',
    title: 'Creator Program • Monetization & Subscriber Tiers • Eternal',
    description:
      'Empowering creators with direct monetization, custom subscriber tiers, rich media posts, and audience analytics on Eternal.',
    heading: 'Creator Program',
    bodyText: 'Monetize your content, create subscriber channels, and grow your audience.',
  },
  {
    path: '/guidelines',
    title: 'Community Guidelines • Respect, Kindness & Safety • Eternal',
    description:
      'Our fundamental principles for positive, respectful discourse, anti-hate speech enforcement, and spam prevention.',
    heading: 'Community Guidelines',
    bodyText: 'Our standards for respectful, healthy, and lawful participation on Eternal.',
  },
  {
    path: '/acknowledgements',
    title: 'Open Source Acknowledgements & Credits • Eternal',
    description:
      'Honoring open-source projects, libraries, and ethical security researchers who contribute to Eternal.',
    heading: 'Acknowledgements & Credits',
    bodyText: 'Thanking the open source community and security researchers.',
  },
  {
    path: '/licenses',
    title: 'Third-Party Software Licenses • Eternal',
    description:
      'Full disclosure of open source and commercial third-party software licenses utilized across the Eternal ecosystem.',
    heading: 'Third-Party Software Licenses',
    bodyText: 'Open-source software licenses and copyright notices.',
  },
  {
    path: '/blog',
    title: 'Eternal Blog • Product Updates & Engineering Stories',
    description:
      'Read official product announcements, design case studies, and engineering deep dives from the Eternal team.',
    heading: 'Eternal Blog',
    bodyText: 'Product updates, architecture deep dives, and feature announcements.',
  },
  {
    path: '/newsroom',
    title: 'Newsroom & Official Press Releases • Eternal',
    description:
      'Official press releases, media kits, corporate updates, and media contact info for journalists and partners.',
    heading: 'Newsroom & Press Releases',
    bodyText: 'Official press releases and announcements for media and partners.',
  },
];

export function prerenderStaticSeo() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.warn(
      `[SEO Prerender] dist/index.html not found at ${INDEX_HTML_PATH}. Skipping prerender.`,
    );
    return;
  }

  const baseHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

  STATIC_ROUTES.forEach((route) => {
    const targetDir = path.join(DIST_DIR, route.path.replace(/^\//, ''));
    fs.mkdirSync(targetDir, { recursive: true });

    const canonicalUrl = `${BASE_URL}${route.path}`;

    // Replace meta tags in HTML
    let renderedHtml = baseHtml
      .replace(/<title>.*?<\/title>/i, `<title>${route.title}</title>`)
      .replace(
        /<meta\s+name=["']description["'].*?>/i,
        `<meta name="description" content="${route.description}" />`,
      )
      .replace(
        /<link\s+rel=["']canonical["'].*?>/i,
        `<link rel="canonical" href="${canonicalUrl}" />`,
      )
      .replace(
        /<meta\s+property=["']og:title["'].*?>/i,
        `<meta property="og:title" content="${route.title}" />`,
      )
      .replace(
        /<meta\s+property=["']og:description["'].*?>/i,
        `<meta property="og:description" content="${route.description}" />`,
      )
      .replace(
        /<meta\s+property=["']og:url["'].*?>/i,
        `<meta property="og:url" content="${canonicalUrl}" />`,
      )
      .replace(
        /<meta\s+name=["']twitter:title["'].*?>/i,
        `<meta name="twitter:title" content="${route.title}" />`,
      )
      .replace(
        /<meta\s+name=["']twitter:description["'].*?>/i,
        `<meta name="twitter:description" content="${route.description}" />`,
      );

    // Inject semantic content for Search Bots inside <div id="root">
    const semanticBody = `
      <header style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 16px;">${route.heading}</h1>
        <p style="font-size: 16px; color: #a1a1aa; line-height: 1.6;">${route.bodyText}</p>
        <p style="font-size: 14px; color: #71717a; margin-top: 12px;">${route.description}</p>
      </header>
    `;

    renderedHtml = renderedHtml.replace(
      '<div id="root"></div>',
      `<div id="root">${semanticBody}</div>`,
    );

    const outputPath = path.join(targetDir, 'index.html');
    fs.writeFileSync(outputPath, renderedHtml, 'utf-8');
  });

  console.log(
    `[SEO Prerender] Successfully generated ${STATIC_ROUTES.length} static SEO HTML pages in dist/!`,
  );
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  prerenderStaticSeo();
}
