import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '@/widgets/footer';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import { DOWNLOAD_TRANSLATIONS } from '@social-network/shared-content';
import { EternalCoin3D } from '../Company/ui/CompanyIllustrations';
import { DownloadHeroPreview } from './ui/DownloadHeroPreview';
import { DownloadDesktopSection } from './ui/DownloadDesktopSection';
import { DownloadMobileSection } from './ui/DownloadMobileSection';

export const DownloadPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const t = DOWNLOAD_TRANSLATIONS[currentLanguage] || DOWNLOAD_TRANSLATIONS.English;

  const [scrollParallax, setScrollParallax] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollParallax(Math.min(window.scrollY * 0.08, 45));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#07050f] text-white font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden">
      <SEOHead
        title={t.heroTitle || 'Download Eternal'}
        description={t.heroSubtitle}
        canonical="/download"
        structuredData={{
          breadcrumbs: [{ name: 'Download Eternal', url: '/download' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* 1. Hero Section */}
      <section className="relative pt-36 pb-20 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-purple-600/25 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          {/* Top-Left Floating 3D Eternal Coin */}
          <div
            className="hidden md:block absolute -left-8 lg:left-4 top-2 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax}px)` }}
          >
            <EternalCoin3D className="w-32 h-32 lg:w-40 lg:h-40" animated={true} />
          </div>

          {/* Hero Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight uppercase mb-6 drop-shadow-2xl max-w-5xl leading-tight">
            {t.heroTitle}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-neutral-200/90 max-w-3xl leading-relaxed mb-10 font-medium">
            {t.heroSubtitle}
          </p>

          <Link
            to="/login"
            className="px-9 py-4 rounded-full bg-[#5822b4] hover:bg-[#6b2bd8] text-white text-sm font-bold transition-colors flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-300"
          >
            <Globe size={18} aria-hidden="true" />
            {t.openWebApp}
          </Link>
          <p className="mt-4 mb-12 max-w-xl text-sm text-neutral-300">{t.nativeUnavailable}</p>

          {/* Desktop & Mobile Companion Live Preview */}
          <p className="mb-3 text-sm text-neutral-400">{t.previewLabel}</p>
          <DownloadHeroPreview />
        </div>
      </section>

      {/* 2. DOWNLOAD FOR DESKTOP Section (Windows x64/ARM64, Linux deb/tar/rpm/pkg dropdowns) */}
      <DownloadDesktopSection
        heading={t.desktopSectionHeading}
        subtitle={t.desktopSectionSubtitle}
        macosLabel={t.macosButton}
        windowsLabel={t.windowsButton}
        linuxLabel={t.linuxButton}
        unavailableLabel={t.unavailableLabel}
      />

      {/* 3. DOWNLOAD FOR MOBILE Section (Phone Mockup + App Store / Google Play) */}
      <DownloadMobileSection
        heading={t.mobileSectionHeading}
        subtitle={t.mobileSectionSubtitle}
        appStoreLabel={t.appStoreButton}
        googlePlayLabel={t.googlePlayButton}
        unavailableLabel={t.unavailableLabel}
      />

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default DownloadPage;
