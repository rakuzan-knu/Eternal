import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Sparkles } from 'lucide-react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import { useAuthStore } from '../../shared/model/useAuthStore';
import { useUIStore } from '../../shared/model/useUIStore';
import { FAMILY_CENTER_TRANSLATIONS } from './data/familyCenterData';
import {
  HourglassIllustration,
  CrestShieldIllustration,
  ParentsIllustration,
  MegaphoneIllustration,
  EyeballsIllustration,
  TeensIllustration,
  GuidelinesBookIllustration,
  SafetyControlsIllustration,
  ExtinguisherIllustration,
  GearIllustration,
} from './ui/FamilyCenterIllustrations';

export const FamilyCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { currentLanguage } = useLanguageStore();

  const t = FAMILY_CENTER_TRANSLATIONS[currentLanguage] || FAMILY_CENTER_TRANSLATIONS.English;

  // FAQ state
  const [activeFaqTab, setActiveFaqTab] = useState<'parents' | 'teens'>('parents');
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({
    'faq-parents-1': true,
  });

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenFamilyCenter = () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: '/safety-family-center', targetModal: 'family-center' },
      });
      return;
    }
    // Open settings on account tab and scroll to Family Center section
    useUIStore.getState().openEditProfile('sec-family');
    navigate('/');
  };

  const currentFaqs = activeFaqTab === 'parents' ? t.faq.parentsFaqs : t.faq.teensFaqs;

  return (
    <div className="min-h-screen bg-[#07050f] text-neutral-200 font-sans selection:bg-purple-500 selection:text-white flex flex-col justify-between">
      <SEOHead
        title="Family Center • Parental Controls & Teen Safeguards"
        description={t.hero.subtitle}
        canonical="/safety/family-center"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Family Center', url: '/safety/family-center' },
          ],
          faqs: (t.faq.parentsFaqs || []).slice(0, 4).map((f) => ({
            question: f.question,
            answer: f.answer,
          })),
        }}
      />
      {/* 1. Universal Top Navbar */}
      <PrivacyNavbar />

      <main className="flex-1 w-full pt-20">
        {/* 2. Hero Section (matching Discord layout) */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#281b75] via-[#1b104a] to-[#07050f] py-16 sm:py-24 px-6 lg:px-12 border-b border-purple-900/30">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />

          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 relative z-10">
            {/* Left 3D Hourglass */}
            <div className="hidden lg:flex flex-1 justify-center lg:justify-start">
              <HourglassIllustration className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80" />
            </div>

            {/* Center Content */}
            <div className="flex-1 max-w-2xl text-center flex flex-col items-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-[1.1] drop-shadow-md">
                {t.hero.title}
              </h1>
              <p className="mt-6 text-base sm:text-lg text-purple-200/90 leading-relaxed max-w-xl font-medium">
                {t.hero.subtitle}
              </p>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleOpenFamilyCenter}
                  className="px-8 py-3.5 rounded-full bg-[#5865F2] hover:bg-[#4752c4] active:scale-95 text-white font-bold text-base shadow-[0_10px_30px_rgba(88,101,242,0.45)] hover:shadow-[0_15px_40px_rgba(88,101,242,0.65)] transition-all duration-300 cursor-pointer"
                >
                  <span>{t.hero.ctaButton}</span>
                </button>
              </div>
            </div>

            {/* Right 3D Shield */}
            <div className="hidden lg:flex flex-1 justify-center lg:justify-end">
              <CrestShieldIllustration className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80" />
            </div>
          </div>
        </section>

        {/* 3. Section: FOR PARENTS AND GUARDIANS (matching Discord Screenshot 2) */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12 border-b border-white/[0.05]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Illustration */}
            <div className="flex justify-center">
              <ParentsIllustration />
            </div>

            {/* Right Text Content */}
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                {t.parentsSection.heading}
              </h2>
              <p className="text-base text-neutral-300 leading-relaxed font-normal">
                {t.parentsSection.p1}
              </p>
              <p className="text-base text-neutral-300 leading-relaxed font-normal">
                {t.parentsSection.p2}
              </p>
              <p className="text-base text-neutral-300 leading-relaxed font-normal">
                {t.parentsSection.p3}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenFamilyCenter}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.parentsSection.ctaButton}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Section: QUOTE CARD (matching Discord Screenshot 3) */}
        <section className="w-full py-16 sm:py-24 px-6 lg:px-12 border-b border-white/[0.05]">
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-[#4f20a6] via-[#3d1685] to-[#2a0e61] border border-white/20 p-8 sm:p-14 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col items-center text-center">
              {/* Top-Left Megaphone */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 opacity-90">
                <MegaphoneIllustration className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>

              {/* Quotation Marks */}
              <div className="text-4xl sm:text-5xl font-black text-purple-300/60 font-serif leading-none select-none mb-2">
                “ ”
              </div>

              {/* Quote Body */}
              <p className="text-lg sm:text-2xl text-white font-semibold leading-relaxed max-w-3xl drop-shadow">
                {t.quoteCard.quote}
              </p>

              {/* Attribution */}
              <div className="mt-8 flex flex-col items-center gap-1">
                <span className="text-sm font-bold tracking-wider uppercase text-purple-200">
                  {t.quoteCard.organization}
                </span>
                <span className="text-base sm:text-lg font-bold text-white">
                  {t.quoteCard.author}
                </span>
                <span className="text-xs sm:text-sm text-purple-300 font-medium">
                  {t.quoteCard.role}
                </span>
              </div>

              {/* Bottom-Right Eyeballs */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 opacity-90">
                <EyeballsIllustration className="w-20 h-16 sm:w-24 sm:h-20" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section: FOR TEENS (matching Discord Screenshot 4) */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12 border-b border-white/[0.05]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Text Content */}
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                {t.teensSection.heading}
              </h2>
              <p className="text-base text-neutral-300 leading-relaxed font-normal">
                {t.teensSection.p1}
              </p>
              <p className="text-base text-neutral-300 leading-relaxed font-normal">
                {t.teensSection.p2}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenFamilyCenter}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {t.teensSection.ctaButton}
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center order-1 lg:order-2">
              <TeensIllustration />
            </div>
          </div>
        </section>

        {/* 6. Section: ETERNAL’S APPROACH TO SAFETY (matching Discord Screenshot 5) */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12 border-b border-white/[0.05]">
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-12">
              {t.safetyApproach.heading}
            </h2>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card 1: Community Guidelines */}
              <div className="rounded-[32px] bg-[#120e24] border border-white/[0.08] p-8 sm:p-12 flex flex-col items-start text-left gap-4 hover:border-purple-500/40 transition-all duration-300 group shadow-xl">
                <GuidelinesBookIllustration className="w-36 h-36 sm:w-44 sm:h-44 -ml-2" />
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-2">
                  {t.safetyApproach.card1.title}
                </h3>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  {t.safetyApproach.card1.description}
                </p>
              </div>

              {/* Card 2: Safety Controls */}
              <div className="rounded-[32px] bg-[#120e24] border border-white/[0.08] p-8 sm:p-12 flex flex-col items-start text-left gap-4 hover:border-purple-500/40 transition-all duration-300 group shadow-xl">
                <SafetyControlsIllustration className="w-36 h-36 sm:w-44 sm:h-44 -ml-2" />
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-2">
                  {t.safetyApproach.card2.title}
                </h3>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  {t.safetyApproach.card2.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Section: FREQUENTLY ASKED QUESTIONS (Accordion) */}
        <section className="w-full py-20 sm:py-28 px-6 lg:px-12">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">
              {t.faq.heading}
            </h2>

            {/* Tab Filter Pill */}
            <div className="flex items-center gap-2 bg-[#120e24] p-1.5 rounded-full border border-white/[0.08] mb-12">
              <button
                type="button"
                onClick={() => setActiveFaqTab('parents')}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  activeFaqTab === 'parents'
                    ? 'bg-[#5822b4] text-white shadow-lg'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.faq.parentsTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveFaqTab('teens')}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  activeFaqTab === 'teens'
                    ? 'bg-[#5822b4] text-white shadow-lg'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.faq.teensTab}
              </button>
            </div>

            {/* Accordion Items */}
            <div className="w-full flex flex-col gap-4">
              {currentFaqs.map((faq) => {
                const isOpen = !!openFaqIds[faq.id];
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl bg-[#0f0c1c] border border-white/[0.08] overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-base sm:text-lg font-bold text-white">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-purple-400 shrink-0 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-neutral-300 leading-relaxed border-t border-white/[0.04] animate-fadeIn">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. Section: WE'RE HERE TO HELP! (matching Discord Screenshot layout) */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#07050f] via-[#130b2c] to-[#07050f] py-32 sm:py-44 lg:py-52 min-h-[680px] lg:min-h-[760px] px-6 lg:px-12 flex items-center justify-center">
          {/* Ambient background glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-6xl mx-auto relative flex flex-col items-center justify-center text-center">
            {/* Left floating 3D Extinguisher (Top-Left) */}
            <div className="hidden lg:block absolute left-0 xl:left-6 -top-16 xl:-top-20 pointer-events-none transition-transform duration-700 hover:scale-105">
              <ExtinguisherIllustration className="w-52 h-52 xl:w-64 xl:h-64" />
            </div>

            {/* Right floating 3D Gear (Bottom-Right) */}
            <div className="hidden lg:block absolute right-0 xl:right-6 -bottom-16 xl:-bottom-20 pointer-events-none transition-transform duration-700 hover:scale-105">
              <GearIllustration className="w-52 h-52 xl:w-64 xl:h-64" />
            </div>

            {/* Center Text Content */}
            <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 z-10 my-auto">
              {/* Mobile/Tablet inline illustrations */}
              <div className="flex lg:hidden items-center justify-between w-full max-w-xs mb-2">
                <ExtinguisherIllustration className="w-28 h-28 sm:w-36 sm:h-36" />
                <GearIllustration className="w-28 h-28 sm:w-36 sm:h-36" />
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight">
                {t.helpSection.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-xl font-normal">
                {t.helpSection.description}
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => navigate('/safety')}
                  className="px-9 py-4 rounded-full bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-white font-bold text-sm sm:text-base shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 cursor-pointer"
                >
                  {t.helpSection.ctaButton}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Universal Footer */}
      <EternalFooter />
    </div>
  );
};
