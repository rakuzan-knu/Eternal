import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import { NEWSROOM_TRANSLATIONS } from './data/newsroomData';
import { EternalTrophy3D } from './ui/NewsroomIllustrations';
import { EternalSprout3D } from '../Company/ui/CompanyIllustrations';
import { PressReleasesSection } from './ui/PressReleasesSection';
import { BlogUpdatesSection } from './ui/BlogUpdatesSection';
import { BrandKitCalloutSection } from './ui/BrandKitCalloutSection';
import { PressContactSection } from './ui/PressContactSection';

export const NewsroomPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const t = NEWSROOM_TRANSLATIONS[currentLanguage] || NEWSROOM_TRANSLATIONS.English;

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
        title={t.heroTitle || 'Newsroom & Press Releases'}
        description={t.heroSubtitle}
        canonical="/newsroom"
        structuredData={{
          breadcrumbs: [{ name: 'Newsroom', url: '/newsroom' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* 1. Hero Section (Press Center Discord Style with Trophy & Sprout Mascots) */}
      <section className="relative pt-36 pb-20 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden">
        {/* Ambient Purple Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-purple-600/25 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 min-h-[340px] justify-center">
          {/* Mascot 1: Top-Left Floating 3D Trophy */}
          <div
            className="hidden md:block absolute -left-6 lg:left-6 -top-2 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax * 0.8}px)` }}
          >
            <EternalTrophy3D className="w-32 h-32 lg:w-44 lg:h-44" />
          </div>

          {/* Mascot 2: Top-Right Floating 3D Sprout */}
          <div
            className="hidden md:block absolute -right-6 lg:right-6 top-4 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax * 1.1}px)` }}
          >
            <EternalSprout3D className="w-32 h-32 lg:w-44 lg:h-44" />
          </div>

          {/* Hero Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight uppercase mb-6 drop-shadow-2xl">
            {t.heroTitle}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-neutral-200/90 max-w-2xl leading-relaxed mb-10 font-medium">
            {t.heroSubtitle}
          </p>

          {/* Center Call-to-Action: "View Brand Kit" */}
          <button
            type="button"
            onClick={() => navigate('/branding')}
            className="px-8 py-3.5 rounded-full bg-[#5822b4] hover:bg-[#6b2bd8] text-white text-sm font-bold tracking-wide shadow-[0_0_30px_rgba(88,34,180,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{t.viewBrandKit}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* 2. PRESS RELEASES AND ANNOUNCEMENTS Section */}
      <PressReleasesSection
        heading={t.pressReleasesHeading}
        loadMoreText={t.loadMoreButton}
        items={t.pressReleases}
      />

      {/* 3. UPDATES FROM THE ETERNAL BLOG Section */}
      <BlogUpdatesSection heading={t.blogHeading} items={t.blogUpdates} />

      {/* 4. ETERNAL BRAND KIT Callout Section */}
      <BrandKitCalloutSection
        heading={t.brandKitHeading}
        subtitle={t.brandKitSubtitle}
        buttonText={t.brandKitButton}
      />

      {/* 5. CONTACT OUR PRESS TEAM Section */}
      <PressContactSection
        heading={t.contactHeading}
        subtitle={t.contactSubtitle}
        buttonText={t.contactButton}
      />

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default NewsroomPage;
