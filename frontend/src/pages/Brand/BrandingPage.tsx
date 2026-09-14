import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import { BRANDING_TRANSLATIONS } from './data/brandingData';
import {
  BrandMascotAnimated3D,
  EternalCrystalCube3D,
  EternalCyberPan3D,
} from './ui/BrandIllustrations';
import { BrandLogoSection } from './ui/BrandLogoSection';
import { BrandSymbolSection } from './ui/BrandSymbolSection';
import { BrandClearspaceSection } from './ui/BrandClearspaceSection';
import { BrandColorsSection } from './ui/BrandColorsSection';
import { BrandLegalSection } from './ui/BrandLegalSection';
import { BrandNeedMoreSection } from './ui/BrandNeedMoreSection';

export const BrandingPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const t = BRANDING_TRANSLATIONS[currentLanguage] || BRANDING_TRANSLATIONS.English;

  const [scrollParallax, setScrollParallax] = useState(0);

  // Parallax Scroll Tracking for Hero Mascots
  useEffect(() => {
    const handleScroll = () => {
      setScrollParallax(Math.min(window.scrollY * 0.08, 45));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToLogos = () => {
    const el = document.getElementById('logo-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden">
      <SEOHead
        title="Brand Assets & Media Kit • Eternal Logos & Guidelines"
        description={t.heroSubtitle}
        canonical="/brand"
        structuredData={{
          type: 'Organization',
          breadcrumbs: [{ name: 'Brand & Media Kit', url: '/brand' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* 1. Hero Section (Deep Indigo/Purple Discord Style with 3 3D Mascots) */}
      <section className="relative pt-36 pb-20 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden">
        {/* Ambient Purple Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-purple-600/25 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 min-h-[380px] justify-center">
          {/* Mascot 1: Left 3D Animated Cyber-Wumpus with scroll parallax */}
          <div
            className="hidden md:block absolute -left-6 lg:left-4 top-4 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax}px)` }}
          >
            <BrandMascotAnimated3D className="w-44 h-44 lg:w-56 lg:h-56" />
          </div>

          {/* Mascot 2: Top-Right 3D Frosted Crystal Glass Cube */}
          <div
            className="hidden md:block absolute -right-6 lg:right-6 -top-2 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax * 0.6}px)` }}
          >
            <EternalCrystalCube3D className="w-36 h-36 lg:w-44 lg:h-44" />
          </div>

          {/* Mascot 3: Bottom-Right 3D Cyber Frying Pan Prop */}
          <div
            className="hidden md:block absolute right-12 lg:right-28 bottom-0 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax * 1.1}px)` }}
          >
            <EternalCyberPan3D className="w-32 h-32 lg:w-40 lg:h-40" />
          </div>

          {/* Large Hero Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight uppercase mb-6 drop-shadow-2xl">
            {t.heroTitle}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-neutral-200/90 max-w-2xl leading-relaxed mb-10 font-medium">
            {t.heroSubtitle}
          </p>

          {/* Center Action Button: "View Brand Kit" */}
          <button
            type="button"
            onClick={scrollToLogos}
            className="px-8 py-3.5 rounded-full bg-[#5822b4] hover:bg-[#6b2bd8] text-white text-sm font-bold tracking-wide shadow-[0_0_30px_rgba(88,34,180,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{t.viewBrandKit}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* 2. OUR LOGO Section (Dark, White, Brand Purple Cards with Download) */}
      <BrandLogoSection
        heading={t.logoHeading}
        subtitle={t.logoSubtitle}
        downloadSvgText={t.downloadSvg}
      />

      {/* 3. SYMBOL Section (Without background & With rounded background) */}
      <BrandSymbolSection
        heading={t.symbolHeading}
        subtitle={t.symbolSubtitle}
        symbolNoBgLabel={t.symbolNoBgLabel}
        symbolRoundedLabel={t.symbolRoundedLabel}
        downloadSvgText={t.downloadSvg}
      />

      {/* 4. CLEARSPACE Section (Construction Grid & Margins) */}
      <BrandClearspaceSection
        heading={t.clearspaceHeading}
        subtitle={t.clearspaceSubtitle}
        label1={t.clearspaceLabel1}
        label2={t.clearspaceLabel2}
      />

      {/* 5. COLORS Section (Interactive Click-to-Copy Swatches) */}
      <BrandColorsSection
        heading={t.colorsHeading}
        subtitle={t.colorsSubtitle}
        swatches={t.swatches}
        copiedText={t.colorCopied}
      />

      {/* 6. LEGAL BRAND GUIDELINES (Do's & Don'ts Accordion) */}
      <BrandLegalSection
        heading={t.legalHeading}
        intro={t.legalIntro}
        dosTitle={t.dosTitle}
        dosItems={t.dosItems}
        dontsTitle={t.dontsTitle}
        dontsItems={t.dontsItems}
        termsLinkText={t.termsLinkText}
        guidelinesLinkText={t.guidelinesLinkText}
      />

      {/* 7. NEED MORE? Call-to-Action Section */}
      <BrandNeedMoreSection
        title={t.needMoreTitle}
        subtitle={t.needMoreSubtitle}
        buttonText={t.viewBrandKit}
        onButtonClick={scrollToLogos}
      />

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default BrandingPage;
