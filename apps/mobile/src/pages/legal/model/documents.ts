import type { SafetyCenterTranslation } from '@social-network/shared-content';

import type { Language } from '@/shared/lib/i18n';

export type ContentLanguage = Language;

export interface DocumentSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
  tip?: string;
  steps?: { stepNumber: number; title: string; description: string }[];
}

export interface DocumentSection {
  id: string;
  number: string;
  title: string;
  tldr?: string;
  subsections: DocumentSubsection[];
}

export interface LegalDocument {
  title: string;
  dates: string[];
  description: string;
  sections: DocumentSection[];
}

interface HeroLike {
  title: string;
  description?: string;
  introLead?: string;
  effectiveDate?: string;
  lastUpdated?: string;
  updatedDate?: string;
}

export type DocumentId =
  | 'terms'
  | 'guidelines'
  | 'paid-services'
  | 'copyright'
  | 'developer-terms'
  | 'privacy'
  | 'cookies'
  | 'privacy-controls'
  | 'data-package'
  | 'regional-privacy'
  | 'retention'
  | 'applicant-privacy'
  | 'law-enforcement';

export type DocumentGroup = 'rules' | 'privacy' | 'safety';

interface DocumentEntry {
  id: DocumentId;
  group: DocumentGroup;
  label: Record<ContentLanguage, string>;
  summary: Record<ContentLanguage, string>;
  webPath: string;
  load: (lang: ContentLanguage) => Promise<{ hero: HeroLike; sections: DocumentSection[] }>;
}

export const DOCUMENTS: DocumentEntry[] = [
  {
    id: 'terms',
    group: 'rules',
    label: { en: 'Terms of Service', uk: 'Умови використання' },
    summary: { en: 'Your agreement with Eternal', uk: 'Ваша угода з Eternal' },
    webPath: '/terms',
    load: async (lang) => {
      const m = await import('@social-network/shared-content/src/legal/terms');
      return {
        hero: m.TERMS_HERO[lang],
        sections: lang === 'uk' ? m.TERMS_SECTIONS_UK : m.TERMS_SECTIONS,
      };
    },
  },
  {
    id: 'guidelines',
    group: 'rules',
    label: { en: 'Community Guidelines', uk: 'Правила спільноти' },
    summary: { en: 'What is and isn’t allowed', uk: 'Що дозволено, а що ні' },
    webPath: '/guidelines',
    load: async (lang) => {
      const m = await import('@social-network/shared-content/src/legal/guidelines');
      return {
        hero: m.GUIDELINES_HERO[lang],
        sections: lang === 'uk' ? m.GUIDELINES_SECTIONS_UK : m.GUIDELINES_SECTIONS,
      };
    },
  },
  {
    id: 'paid-services',
    group: 'rules',
    label: { en: 'Paid Services Terms', uk: 'Умови платних послуг' },
    summary: { en: 'Purchases, billing and refunds', uk: 'Покупки, оплата та повернення' },
    webPath: '/terms/paid-services',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/paidServicesData'))
        .PAID_SERVICES_DATA[lang],
  },
  {
    id: 'copyright',
    group: 'rules',
    label: { en: 'Copyright Policy', uk: 'Політика авторського права' },
    summary: { en: 'Reporting infringement and takedowns', uk: 'Скарги на порушення та видалення' },
    webPath: '/copyright',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/copyrightPolicyData'))
        .COPYRIGHT_POLICY_DATA[lang],
  },
  {
    id: 'developer-terms',
    group: 'rules',
    label: { en: 'Developer Terms', uk: 'Умови для розробників' },
    summary: { en: 'Rules for apps and integrations', uk: 'Правила для застосунків та інтеграцій' },
    webPath: '/terms/developer',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/developerTermsData'))
        .DEVELOPER_TERMS_DATA[lang],
  },
  {
    id: 'privacy',
    group: 'privacy',
    label: { en: 'Privacy Policy', uk: 'Політика конфіденційності' },
    summary: { en: 'What we collect and why', uk: 'Що ми збираємо і навіщо' },
    webPath: '/privacy',
    load: async (lang) => {
      const m = await import('@social-network/shared-content/src/legal/privacy');
      return {
        hero: m.PRIVACY_HERO[lang],
        sections: lang === 'uk' ? m.PRIVACY_SECTIONS_UK : m.PRIVACY_SECTIONS_EN,
      };
    },
  },
  {
    id: 'cookies',
    group: 'privacy',
    label: { en: 'Cookie Policy', uk: 'Політика щодо файлів cookie' },
    summary: { en: 'Cookies and local storage', uk: 'Файли cookie та локальне сховище' },
    webPath: '/terms/cookie-policy',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/cookiePolicyData'))
        .COOKIE_POLICY_DATA[lang],
  },
  {
    id: 'privacy-controls',
    group: 'privacy',
    label: { en: 'Data Privacy Controls', uk: 'Керування конфіденційністю' },
    summary: { en: 'Settings that control your data', uk: 'Налаштування для ваших даних' },
    webPath: '/terms/data-privacy-controls',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/dataPrivacyControlsData'))
        .DATA_PRIVACY_CONTROLS_DATA[lang],
  },
  {
    id: 'data-package',
    group: 'privacy',
    label: { en: 'Your Data Package', uk: 'Ваш пакет даних' },
    summary: {
      en: 'Request and read a copy of your data',
      uk: 'Запит і перегляд копії ваших даних',
    },
    webPath: '/terms/your-eternal-data-package',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/dataPackageData')).DATA_PACKAGE_DATA[
        lang
      ],
  },
  {
    id: 'regional-privacy',
    group: 'privacy',
    label: { en: 'Regional Privacy Notices', uk: 'Регіональні повідомлення' },
    summary: { en: 'Rights under local laws', uk: 'Права згідно з місцевими законами' },
    webPath: '/terms/regional-privacy',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/regionalPrivacyData'))
        .REGIONAL_PRIVACY_DATA[lang],
  },
  {
    id: 'retention',
    group: 'privacy',
    label: { en: 'Data Retention Policy', uk: 'Політика зберігання даних' },
    summary: { en: 'How long we keep data', uk: 'Як довго ми зберігаємо дані' },
    webPath: '/terms/retention-policy',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/retentionPolicyData'))
        .RETENTION_POLICY_DATA[lang],
  },
  {
    id: 'applicant-privacy',
    group: 'privacy',
    label: { en: 'Applicant Privacy Notice', uk: 'Конфіденційність кандидатів' },
    summary: {
      en: 'For people applying to work at Eternal',
      uk: 'Для кандидатів на роботу в Eternal',
    },
    webPath: '/terms/applicant-candidate',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/legal/applicantPrivacyData'))
        .APPLICANT_PRIVACY_DATA[lang],
  },
  {
    id: 'law-enforcement',
    group: 'safety',
    label: { en: 'Law Enforcement Guidelines', uk: 'Правила для правоохоронців' },
    summary: { en: 'How we handle legal requests', uk: 'Як ми обробляємо запити органів' },
    webPath: '/safety/law-enforcement',
    load: async (lang) =>
      (await import('@social-network/shared-content/src/safety/lawEnforcementData'))
        .LAW_ENFORCEMENT_DATA[lang],
  },
];

export function findDocument(id: DocumentId) {
  const entry = DOCUMENTS.find((item) => item.id === id);
  if (!entry) throw new Error(`Unknown document: ${id}`);
  return entry;
}

export async function loadDocument(id: DocumentId, lang: ContentLanguage): Promise<LegalDocument> {
  const entry = findDocument(id);
  const { hero, sections } = await entry.load(lang);
  const dates = splitDates([hero.effectiveDate, hero.lastUpdated, hero.updatedDate]);
  return {
    title: entry.label[lang],
    dates,
    description: hero.description ?? hero.introLead ?? '',
    sections,
  };
}

function splitDates(values: (string | undefined)[]) {
  return values
    .filter((value): value is string => !!value?.trim())
    .flatMap((value) => value.split('•').map((part) => part.trim()))
    .filter((value, index, all) => value && all.indexOf(value) === index);
}

export { languageFromLocale as contentLanguage } from '@/shared/lib/i18n';

export function sentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed !== trimmed.toUpperCase()) return trimmed;
  const lower = trimmed.toLowerCase().replace(/\beternal\b/g, 'Eternal');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export async function loadSafetyCenter(lang: ContentLanguage): Promise<SafetyCenterTranslation> {
  const m = await import('@social-network/shared-content/src/safety/safetyCenterData');
  return lang === 'uk' ? m.SAFETY_CENTER_UK : m.SAFETY_CENTER_EN;
}

export const SAFETY_HUB_KEYS = [
  'safetyLibrary',
  'privacyHub',
  'parentHub',
  'transparencyHub',
  'safetyNewsHub',
  'policyHub',
  'teenCharter',
  'wellbeingHub',
] as const;

export const chrome = {
  en: {
    contents: 'Contents',
    inShort: 'In short',
    backToTop: 'Back to top',
    openOnWeb: 'Open on the web',
    helpTitle: 'Help & Safety',
    groups: { rules: 'Terms & rules', privacy: 'Privacy', safety: 'Safety' },
    resources: 'Safety resources',
    sectionCount: (count: number) => `${count} sections`,
  },
  uk: {
    contents: 'Зміст',
    inShort: 'Коротко',
    backToTop: 'Нагору',
    openOnWeb: 'Відкрити у вебі',
    helpTitle: 'Допомога та безпека',
    groups: { rules: 'Умови та правила', privacy: 'Конфіденційність', safety: 'Безпека' },
    resources: 'Ресурси з безпеки',
    sectionCount: (count: number) => `Розділів: ${count}`,
  },
} satisfies Record<ContentLanguage, unknown>;
