import { SupportedLanguage } from '../../../shared/lib/language/languageStore';
import {
  GUIDELINES_SECTIONS,
  GUIDELINES_SECTIONS_UK,
  GUIDELINES_HERO,
  type GuidelinesSection,
} from '@social-network/shared-content';
import { getLegalTranslation as getPrivacyTranslation } from '@/shared/config/privacyTranslations';

export interface GuidelinesUITranslation {
  navbar: {
    product: string;
    safety: string;
    support: string;
    blog: string;
    developers: string;
    careers: string;
    openEternal: string;
    infoTitle: string;
    centersTitle: string;
    resourcesTitle: string;
    collectionsTitle: string;
    learnTitle: string;
    buildTitle: string;
    familyCenter: string;
    safetyLibrary: string;
    securityBulletins: string;
    teenSafety: string;
    voiceRoomGuidelines: string;
    parentHub: string;
    policyEnforcement: string;
    privacyPolicyActive: string;
    transparencyReports: string;
    helpCenter: string;
    feedback: string;
    submitRequest: string;
    featured: string;
    community: string;
    eternalHq: string;
    engineering: string;
    howToEternal: string;
    policySafety: string;
    productFeatures: string;
    eternalForDevs: string;
    integration: string;
    socialCommerce: string;
    appsActivities: string;
    devNewsletter: string;
    devCaseStudies: string;
    officialCommunities: string;
    devPortal: string;
    documentation: string;
    devHelpCenter: string;
  };
  hero: {
    title: string;
    effectiveDate: string;
    description: string;
  };
  toc: {
    contents: string;
    readProgress: string;
    print: string;
    backToTop: string;
  };
  callout: {
    briefly: string;
  };
  sections: GuidelinesSection[];
}

// 1. English (Default)
const EN_GUIDELINES: GuidelinesUITranslation = {
  navbar: getPrivacyTranslation('English').navbar,
  hero: GUIDELINES_HERO.en,
  toc: {
    contents: 'Contents',
    readProgress: '% read',
    print: 'Print',
    backToTop: 'Back to Top',
  },
  callout: {
    briefly: 'Briefly about this',
  },
  sections: GUIDELINES_SECTIONS,
};

// 2. Ukrainian (Українська)
const UK_GUIDELINES: GuidelinesUITranslation = {
  navbar: getPrivacyTranslation('Українська').navbar,
  hero: GUIDELINES_HERO.uk,
  toc: {
    contents: 'Зміст',
    readProgress: '% прочитано',
    print: 'Друк',
    backToTop: 'Нагору',
  },
  callout: {
    briefly: 'Коротко про це',
  },
  sections: GUIDELINES_SECTIONS_UK,
};

// Translation Map for all supported languages
const GUIDELINES_TRANSLATION_MAP: Record<SupportedLanguage, GuidelinesUITranslation> = {
  English: EN_GUIDELINES,
  'English (UK)': EN_GUIDELINES,
  Українська: UK_GUIDELINES,
  Deutsch: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Deutsch').navbar,
    hero: {
      title: 'ETERNAL COMMUNITY-RICHTLINIEN',
      effectiveDate: 'Gültig ab: 1. September 2026 • Zuletzt aktualisiert: 28. August 2026',
      description: 'Unsere Richtlinien sorgen für ein sicheres und freundliches Miteinander.',
    },
    toc: {
      contents: 'Inhalt',
      readProgress: '% gelesen',
      print: 'Drucken',
      backToTop: 'Nach oben',
    },
    callout: { briefly: 'Kurz gesagt' },
  },
  Español: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Español').navbar,
    hero: {
      title: 'DIRECTRICES DE LA COMUNIDAD DE ETERNAL',
      effectiveDate:
        'Fecha de vigencia: 1 de septiembre de 2026 • Última actualización: 28 de agosto de 2026',
      description: 'Nuestras directrices garantizan un espacio seguro y respetuoso para todos.',
    },
    toc: {
      contents: 'Contenido',
      readProgress: '% leído',
      print: 'Imprimir',
      backToTop: 'Volver arriba',
    },
    callout: { briefly: 'En resumen' },
  },
  Français: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Français').navbar,
    hero: {
      title: 'CHARTE DE LA COMMUNAUTÉ D’ETERNAL',
      effectiveDate:
        'Date d’entrée en vigueur : 1er septembre 2026 • Dernière mise à jour : 28 août 2026',
      description: 'Notre charte garantit un espace sûr et bienveillant pour chacun.',
    },
    toc: {
      contents: 'Sommaire',
      readProgress: '% lu',
      print: 'Imprimer',
      backToTop: 'Haut de page',
    },
    callout: { briefly: 'En résumé' },
  },
  Italiano: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Italiano').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'LINEE GUIDA DELLA COMMUNITY DI ETERNAL' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Indice', print: 'Stampa' },
    callout: { briefly: 'In breve' },
  },
  Magyar: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Magyar').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL KÖZÖSSÉGI IRÁNYELVEK' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Tartalom', print: 'Nyomtatás' },
    callout: { briefly: 'Röviden erről' },
  },
  Nederlands: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Nederlands').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL COMMUNITYRICHTLIJNEN' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Inhoudsopgave', print: 'Afdrukken' },
    callout: { briefly: 'Kort hierover' },
  },
  Polski: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Polski').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'WYTYCZNE DLA SPOŁECZNOŚCI ETERNAL' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Spis treści', print: 'Drukuj' },
    callout: { briefly: 'Krótko o tym' },
  },
  'Português (Brasil)': {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Português (Brasil)').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'DIRETRIZES DA COMUNIDADE DA ETERNAL' },
    toc: { ...EN_GUIDELINES.toc, contents: 'Índice', print: 'Imprimir' },
    callout: { briefly: 'Em resumo' },
  },
  Türkçe: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('Türkçe').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL TOPLULUK KURALLARI' },
    toc: { ...EN_GUIDELINES.toc, contents: 'İçindekiler', print: 'Yazdır' },
    callout: { briefly: 'Kısaca bu konuda' },
  },
  日本語: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('日本語').navbar,
    hero: {
      title: 'ETERNAL コミュニティガイドライン',
      effectiveDate: '発効日：2026年9月1日 • 最終更新：2026年8月28日',
      description: 'すべてのユーザーが安心・安全に自己表現できるコミュニティを目指しています。',
    },
    toc: { contents: '目次', readProgress: '% 読了', print: '印刷', backToTop: 'トップへ戻る' },
    callout: { briefly: '概要' },
  },
  한국어: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('한국어').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL 커뮤니티 가이드라인' },
    toc: { ...EN_GUIDELINES.toc, contents: '목차', print: '인쇄' },
    callout: { briefly: '간단히 보기' },
  },
  繁體中文: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('繁體中文').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL 社群守則' },
    toc: { ...EN_GUIDELINES.toc, contents: '目錄', print: '列印' },
    callout: { briefly: '簡要說明' },
  },
  简体中文: {
    ...EN_GUIDELINES,
    navbar: getPrivacyTranslation('简体中文').navbar,
    hero: { ...EN_GUIDELINES.hero, title: 'ETERNAL 社区准则' },
    toc: { ...EN_GUIDELINES.toc, contents: '目录', print: '打印' },
    callout: { briefly: '简要说明' },
  },
};

export const getGuidelinesTranslation = (lang: SupportedLanguage): GuidelinesUITranslation => {
  return GUIDELINES_TRANSLATION_MAP[lang] || EN_GUIDELINES;
};
