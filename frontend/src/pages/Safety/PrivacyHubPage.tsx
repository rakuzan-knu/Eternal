import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { PRIVACY_HUB_DATA } from './data/privacyHubData';
import {
  PrivacyHeroSunglassesIllustration,
  PrivacyHeroShieldIllustration,
  PrivacyChestIllustration,
  PrincipleCardIcon,
} from './ui/PrivacyHubIllustrations';

export const PrivacyHubPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const t = isUkrainian ? PRIVACY_HUB_DATA.uk : PRIVACY_HUB_DATA.en;

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title={t.hero.title || 'Privacy Hub'}
        description={t.hero.subtitle}
        canonical="/safety/privacy"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Privacy Hub', url: '/safety/privacy' },
          ],
        }}
      />
      {/* Top Universal Navbar */}
      <PrivacyNavbar />

      <main className="flex-1 flex flex-col">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                          */}
        {/* ========================================================================= */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-[#241764] via-[#160e3e] to-[#07050f]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
            {/* Left 3D Sunglasses */}
            <div className="flex-shrink-0 order-2 lg:order-1">
              <PrivacyHeroSunglassesIllustration />
            </div>

            {/* Center Typography */}
            <div className="max-w-2xl flex flex-col items-center text-center order-1 lg:order-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase drop-shadow-[0_5px_20px_rgba(0,0,0,0.6)]">
                {t.hero.title}
              </h1>
              <p className="mt-5 text-lg sm:text-xl text-neutral-300 font-medium leading-relaxed max-w-xl">
                {t.hero.subtitle}
              </p>
            </div>

            {/* Right 3D Shield */}
            <div className="flex-shrink-0 order-3">
              <PrivacyHeroShieldIllustration />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. OUR PRIVACY PRINCIPLES (2x2 Grid)                                     */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-28 bg-[#07050f] relative">
          <div className="max-w-6xl mx-auto px-6 lg:px-12">
            {/* Section Heading */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase text-white">
                {t.principlesSection.title}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-neutral-300 leading-relaxed">
                {t.principlesSection.subtitle}
              </p>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {t.principlesSection.items.map((item) => (
                <div
                  key={item.id}
                  className="p-8 sm:p-10 rounded-[32px] bg-[#110e20] border border-white/5 hover:border-purple-500/30 hover:bg-[#16122a] transition-all duration-300 flex flex-col items-start gap-6 group hover:-translate-y-1 shadow-[0_15px_35px_rgba(0,0,0,0.4)]"
                >
                  <PrincipleCardIcon iconSrc={item.icon} alt={item.title} />
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. PRIVACY PRESERVING PRODUCTS (Split Banner)                            */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-28 bg-[#07050f] relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-12">
            {/* Left 3D Chest & Sword */}
            <div className="flex-1 flex justify-center lg:justify-start">
              <PrivacyChestIllustration />
            </div>

            {/* Right Content */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 max-w-xl">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase text-white leading-tight">
                {t.productsSection.title}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
                {t.productsSection.description}
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 rounded-full bg-[#5822b4] hover:bg-[#6c2ee0] text-white font-bold text-base transition-all duration-300 shadow-[0_10px_25px_rgba(88,34,180,0.4)] hover:shadow-[0_15px_35px_rgba(108,46,224,0.6)] hover:scale-105 active:scale-95"
              >
                {t.productsSection.learnMore}
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. PRIVACY POLICIES (2-Column Grid of Pills)                             */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-28 bg-[#07050f] relative">
          <div className="max-w-5xl mx-auto px-6 lg:px-12">
            {/* Section Heading */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase text-white">
                {t.policiesSection.title}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-neutral-300 leading-relaxed">
                {t.policiesSection.subtitle}
              </p>
            </div>

            {/* Grid of Policy Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {t.policiesSection.items.map((policy) => (
                <Link
                  key={policy.id}
                  to={policy.href}
                  className="px-8 py-6 rounded-3xl bg-[#110e20] hover:bg-[#5822b4] border border-white/5 hover:border-purple-400/40 text-white font-bold text-base sm:text-lg transition-all duration-300 flex items-center justify-between group shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_40px_rgba(88,34,180,0.5)] hover:-translate-y-0.5"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    {policy.title}
                  </span>
                  <span className="text-purple-400 group-hover:text-white transition-colors text-xl font-bold">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 5. LEARN MORE MODAL DIALOG                                               */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#151126] border border-purple-500/30 rounded-3xl max-w-lg w-full p-8 text-white relative shadow-2xl animate-scaleUp">
            <h3 className="text-2xl font-black uppercase text-purple-300 mb-6">
              {t.productsSection.modalTitle}
            </h3>

            <ul className="space-y-4 text-neutral-200 text-sm sm:text-base mb-8">
              {t.productsSection.modalPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-purple-400 font-bold mt-0.5">✦</span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg hover:scale-105"
              >
                {t.productsSection.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};
