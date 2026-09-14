import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import { SAFETY_CENTER_TRANSLATIONS } from './data/safetyCenterData';
import {
  SafetyHeroShieldIllustration,
  SafetyHeroEggIllustration,
  SafetyLibraryBookIllustration,
  PrivacyTentIllustration,
  ParentHubIllustration,
  TransparencyHubIllustration,
  SafetyNewsMicIllustration,
  PolicyLaptopIllustration,
  TeenCharterIllustration,
  WellbeingHeartIllustration,
} from './ui/SafetyCenterIllustrations';

export const SafetyCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const t = SAFETY_CENTER_TRANSLATIONS[currentLanguage] || SAFETY_CENTER_TRANSLATIONS.English;

  return (
    <div className="min-h-screen bg-[#07050f] text-neutral-200 font-sans selection:bg-purple-500 selection:text-white flex flex-col justify-between">
      <SEOHead
        title={t.hero.title || 'Safety Center'}
        description={t.hero.subtitle}
        canonical="/safety"
        structuredData={{
          breadcrumbs: [{ name: 'Safety Center', url: '/safety' }],
          faqs: [
            {
              question: 'What safety tools does Eternal provide?',
              answer:
                'Eternal provides real-time proactive moderation, granular block and mute controls, biometric device gates, and teen protection defaults.',
            },
            {
              question: 'How do I report harassment or abuse on Eternal?',
              answer:
                'Click the three-dots menu on any post, profile, or message and select Report. Reports are reviewed 24/7 by our Trust and Safety team.',
            },
          ],
        }}
      />
      {/* 1. Universal Top Navbar */}
      <PrivacyNavbar />

      <main className="flex-1 w-full pt-20">
        {/* 2. Hero Section (matching Discord Safety Center) */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#281b75] via-[#1b104a] to-[#07050f] py-20 sm:py-28 lg:py-36 px-6 lg:px-12 flex items-center justify-center">
          {/* Ambient Background Glows */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-6xl mx-auto relative flex flex-col items-center justify-center text-center">
            {/* Left floating 3D Shield (Top-Left / Middle-Left) */}
            <div className="hidden lg:block absolute -left-4 xl:left-0 top-1/2 -translate-y-1/2 pointer-events-none">
              <SafetyHeroShieldIllustration className="w-48 h-48 xl:w-60 xl:h-60" />
            </div>

            {/* Right floating 3D Spotted Egg (Top-Right) */}
            <div className="hidden lg:block absolute -right-4 xl:right-0 -top-8 xl:-top-12 pointer-events-none">
              <SafetyHeroEggIllustration className="w-44 h-44 xl:w-56 xl:h-56" />
            </div>

            {/* Center Hero Content */}
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 z-10">
              {/* Mobile/Tablet inline illustrations */}
              <div className="flex lg:hidden items-center justify-between w-full max-w-xs mb-2">
                <SafetyHeroShieldIllustration className="w-24 h-24 sm:w-32 sm:h-32" />
                <SafetyHeroEggIllustration className="w-24 h-24 sm:w-32 sm:h-32" />
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight">
                {t.hero.title}
              </h1>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl font-normal">
                {t.hero.subtitle}
              </p>
            </div>
          </div>
        </section>

        {/* 3. Section 1: SAFETY LIBRARY */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Text Content */}
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.safetyLibrary.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.safetyLibrary.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.safetyLibrary.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.safetyLibrary.ctaButton}
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center order-1 lg:order-2">
              <SafetyLibraryBookIllustration />
            </div>
          </div>
        </section>

        {/* 4. Section 2: PRIVACY HUB */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Illustration */}
            <div className="flex justify-center">
              <PrivacyTentIllustration />
            </div>

            {/* Right Text Content */}
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.privacyHub.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.privacyHub.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.privacyHub.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.privacyHub.ctaButton}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section 3: PARENT HUB */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Text Content */}
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.parentHub.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.parentHub.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.parentHub.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.parentHub.ctaButton}
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center order-1 lg:order-2">
              <ParentHubIllustration />
            </div>
          </div>
        </section>

        {/* 6. Section 4: TRANSPARENCY HUB */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Illustration */}
            <div className="flex justify-center">
              <TransparencyHubIllustration />
            </div>

            {/* Right Text Content */}
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.transparencyHub.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.transparencyHub.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.transparencyHub.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.transparencyHub.ctaButton}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Section 5: SAFETY NEWS HUB */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Text Content */}
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.safetyNewsHub.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.safetyNewsHub.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.safetyNewsHub.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.safetyNewsHub.ctaButton}
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center order-1 lg:order-2">
              <SafetyNewsMicIllustration />
            </div>
          </div>
        </section>

        {/* 8. Section 6: POLICY HUB */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Illustration */}
            <div className="flex justify-center">
              <PolicyLaptopIllustration />
            </div>

            {/* Right Text Content */}
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.policyHub.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.policyHub.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.policyHub.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.policyHub.ctaButton}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Section 7: TEEN CHARTER */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Text Content */}
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.teenCharter.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.teenCharter.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.teenCharter.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.teenCharter.ctaButton}
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center order-1 lg:order-2">
              <TeenCharterIllustration />
            </div>
          </div>
        </section>

        {/* 10. Section 8: WELLBEING HUB */}
        <section className="w-full py-20 sm:py-32 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Illustration */}
            <div className="flex justify-center">
              <WellbeingHeartIllustration />
            </div>

            {/* Right Text Content */}
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {t.wellbeingHub.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {t.wellbeingHub.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(t.wellbeingHub.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.wellbeingHub.ctaButton}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 11. Universal Footer */}
      <EternalFooter />
    </div>
  );
};
