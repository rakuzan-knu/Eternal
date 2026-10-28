import { SupportedLanguage } from '../../../shared/lib/language/languageStore';
import {
  TERMS_SECTIONS,
  TERMS_SECTIONS_UK,
  TERMS_HERO,
  type TermsSection,
} from '@social-network/shared-content';
import { getLegalTranslation as getPrivacyTranslation } from '@/shared/config/privacyTranslations';

export interface TermsUITranslation {
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
  sections: TermsSection[];
}

// 1. English (Default)
const EN_TERMS: TermsUITranslation = {
  navbar: getPrivacyTranslation('English').navbar,
  hero: TERMS_HERO.en,
  toc: {
    contents: 'Contents',
    readProgress: '% read',
    print: 'Print',
    backToTop: 'Back to Top',
  },
  callout: {
    briefly: 'Briefly about this',
  },
  sections: TERMS_SECTIONS,
};

// 2. Ukrainian (Українська)
const UK_TERMS: TermsUITranslation = {
  navbar: getPrivacyTranslation('Українська').navbar,
  hero: TERMS_HERO.uk,
  toc: {
    contents: 'Зміст',
    readProgress: '% прочитано',
    print: 'Друк',
    backToTop: 'Нагору',
  },
  callout: {
    briefly: 'Коротко про це',
  },
  sections: TERMS_SECTIONS_UK,
};

// Language map
const TERMS_TRANSLATION_MAP: Record<SupportedLanguage, TermsUITranslation> = {
  English: EN_TERMS,
  'English (UK)': EN_TERMS,
  Українська: UK_TERMS,
  Deutsch: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Deutsch').navbar,
    hero: {
      title: 'ETERNAL NUTZUNGSBEDINGUNGEN',
      effectiveDate: 'Gültig ab: 1. September 2026 • Zuletzt aktualisiert: 28. August 2026',
      description:
        'Diese Nutzungsbedingungen legen unsere gegenseitige Vereinbarung für die Nutzung von Eternal fest.',
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
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Español').navbar,
    hero: {
      title: 'TÉRMINOS DE SERVICIO DE ETERNAL',
      effectiveDate:
        'Fecha de vigencia: 1 de septiembre de 2026 • Última actualización: 28 de agosto de 2026',
      description:
        'Estos Términos de servicio establecen nuestro acuerdo legal cuando usas Eternal.',
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
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Français').navbar,
    hero: {
      title: 'CONDITIONS D’UTILISATION D’ETERNAL',
      effectiveDate:
        'Date d’entrée en vigueur : 1er septembre 2026 • Dernière mise à jour : 28 août 2026',
      description:
        'Ces Conditions d’utilisation définissent notre accord lorsque vous utilisez Eternal.',
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
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Italiano').navbar,
    hero: { ...EN_TERMS.hero, title: 'TERMINI DI SERVIZIO DI ETERNAL' },
    toc: { ...EN_TERMS.toc, contents: 'Indice', print: 'Stampa' },
    callout: { briefly: 'In breve' },
  },
  Magyar: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Magyar').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL FELHASZNÁLÁSI FELTÉTELEK' },
    toc: { ...EN_TERMS.toc, contents: 'Tartalom', print: 'Nyomtatás' },
    callout: { briefly: 'Röviden erről' },
  },
  Nederlands: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Nederlands').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL GEBRUIKSVOORWAARDEN' },
    toc: { ...EN_TERMS.toc, contents: 'Inhoudsopgave', print: 'Afdrukken' },
    callout: { briefly: 'Kort hierover' },
  },
  Polski: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Polski').navbar,
    hero: { ...EN_TERMS.hero, title: 'WARUNKI KORZYSTANIA Z ETERNAL' },
    toc: { ...EN_TERMS.toc, contents: 'Spis treści', print: 'Drukuj' },
    callout: { briefly: 'Krótko o tym' },
  },
  'Português (Brasil)': {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Português (Brasil)').navbar,
    hero: { ...EN_TERMS.hero, title: 'TERMOS DE SERVIÇO DA ETERNAL' },
    toc: { ...EN_TERMS.toc, contents: 'Índice', print: 'Imprimir' },
    callout: { briefly: 'Em resumo' },
  },
  Türkçe: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('Türkçe').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL KULLANIM KOŞULLARI' },
    toc: { ...EN_TERMS.toc, contents: 'İçindekiler', print: 'Yazdır' },
    callout: { briefly: 'Kısaca bu konuda' },
  },
  日本語: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('日本語').navbar,
    hero: {
      title: 'ETERNAL 利用規約',
      effectiveDate: '発効日：2026年9月1日 • 最終更新：2026年8月28日',
      description: '本利用規約は、Eternalのサービスをご利用いただく際の法的条件を定めるものです。',
    },
    toc: { contents: '目次', readProgress: '% 読了', print: '印刷', backToTop: 'トップへ戻る' },
    callout: { briefly: '概要' },
  },
  한국어: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('한국어').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL 서비스 이용약관' },
    toc: { ...EN_TERMS.toc, contents: '목차', print: '인쇄' },
    callout: { briefly: '간단히 보기' },
  },
  繁體中文: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('繁體中文').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL 服務條款' },
    toc: { ...EN_TERMS.toc, contents: '目錄', print: '列印' },
    callout: { briefly: '簡要說明' },
  },
  简体中文: {
    ...EN_TERMS,
    navbar: getPrivacyTranslation('简体中文').navbar,
    hero: { ...EN_TERMS.hero, title: 'ETERNAL 服务条款' },
    toc: { ...EN_TERMS.toc, contents: '目录', print: '打印' },
    callout: { briefly: '简要说明' },
  },
};

export const getTermsTranslation = (lang: SupportedLanguage): TermsUITranslation => {
  return TERMS_TRANSLATION_MAP[lang] || EN_TERMS;
};
