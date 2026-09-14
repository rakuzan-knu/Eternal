import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { WELLBEING_HUB_EN, WELLBEING_HUB_UK, WellbeingArticleCard } from './data/wellbeingHubData';
import { ParentHubIllustration, TeenCharterIllustration } from './ui/SafetyCenterIllustrations';
import {
  WellbeingHeroShieldIllustration,
  WellbeingSproutIllustration,
  CrisisHeartGemIllustration,
  WellbeingControllerIcon,
  WellbeingHighFiveIcon,
  WellbeingShieldHeartIcon,
  WellbeingLotusEmpathyIcon,
  WellbeingArticleThumbnail,
  WellbeingMegaphoneIllustration,
  ConnectSafelyLogo,
  GooglyEyesIllustration,
} from './ui/WellbeingIllustrations';
import {
  Heart,
  BookOpen,
  PhoneCall,
  Globe2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  X,
  ShieldCheck,
  Users,
  Quote,
} from 'lucide-react';

export const WellbeingHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? WELLBEING_HUB_UK : WELLBEING_HUB_EN;

  // Modals state
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<WellbeingArticleCard | null>(null);

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title={data.hero.title || 'Digital Wellbeing'}
        description={data.hero.subtitle}
        canonical="/safety/wellbeing"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Digital Wellbeing', url: '/safety/wellbeing' },
          ],
        }}
      />
      {/* 1. Universal Top Navigation Bar */}
      <PrivacyNavbar />

      <main className="flex-1 w-full flex flex-col gap-20 sm:gap-28 pb-28">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (With 3D Metallic Shield and 3D Turnip Sprout Mascot)      */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#2b186d] via-[#1c0f48] via-45% via-[#120930] via-75% to-[#07050f] pt-36 pb-24 sm:pt-44 sm:pb-32 px-6 lg:px-12 flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/25 via-indigo-600/15 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto w-full relative flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-8">
            {/* Left 3D Shield Graphic */}
            <div className="hidden lg:flex justify-center shrink-0 z-10">
              <WellbeingHeroShieldIllustration />
            </div>

            {/* Center Typography */}
            <div className="flex-1 flex flex-col items-center text-center gap-6 z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-xs font-bold uppercase tracking-wider text-purple-300 shadow-lg">
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                <span>Eternal Mental Health & Balance</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
                {data.hero.title}
              </h1>

              <p className="text-lg sm:text-xl text-neutral-300 font-medium leading-relaxed max-w-xl">
                {data.hero.subtitle}
              </p>
            </div>

            {/* Right 3D Turnip Sprout Mascot Graphic */}
            <div className="flex justify-center shrink-0 z-10">
              <WellbeingSproutIllustration />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. WELLBEING & EMPOWERMENT RESOURCES (Emerald Liquid Glass iOS Cards)     */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col gap-12 sm:gap-14">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {data.resourcesSection.title}
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-medium">
              {data.resourcesSection.subtitle}
            </p>
          </div>

          {/* Resources Grid */}
          <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
            {/* Resource 1: Eternal Player's Guide */}
            <div className="relative rounded-[32px] sm:rounded-[36px] bg-gradient-to-br from-[#064e3b]/90 via-[#065f46]/80 to-[#042f2e]/90 backdrop-blur-2xl border border-emerald-400/30 p-8 sm:p-10 flex flex-col items-start gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all hover:border-emerald-400/50">
              <div className="space-y-3 text-left">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                  {data.resourcesSection.resources[0].title}
                </h3>
                <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
                  {data.resourcesSection.resources[0].description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/guidelines')}
                className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{data.resourcesSection.resources[0].actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Resource 2: Crisis Text Line (With 3D Heart Gem Artwork) */}
            <div className="relative rounded-[32px] sm:rounded-[36px] bg-gradient-to-br from-[#064e3b]/90 via-[#065f46]/80 to-[#042f2e]/90 backdrop-blur-2xl border border-emerald-400/30 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all hover:border-emerald-400/50 overflow-hidden">
              <div className="flex-1 space-y-4 text-left">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                  {data.resourcesSection.resources[1].title}
                </h3>
                <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
                  {data.resourcesSection.resources[1].description}
                </p>

                {/* Badge Tag */}
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-emerald-950 font-black text-sm sm:text-base shadow-lg">
                  <PhoneCall className="w-4 h-4 text-emerald-700" />
                  <span>{data.resourcesSection.resources[1].badgeText}</span>
                </div>
              </div>

              {/* 3D Heart Gem Illustration */}
              <div className="shrink-0">
                <CrisisHeartGemIllustration />
              </div>
            </div>

            {/* Resource 3: ThroughLine */}
            <div className="relative rounded-[32px] sm:rounded-[36px] bg-gradient-to-br from-[#064e3b]/90 via-[#065f46]/80 to-[#042f2e]/90 backdrop-blur-2xl border border-emerald-400/30 p-8 sm:p-10 flex flex-col items-start gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all hover:border-emerald-400/50">
              <div className="space-y-3 text-left">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                  {data.resourcesSection.resources[2].title}
                </h3>
                <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
                  {data.resourcesSection.resources[2].description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSupportModalOpen(true)}
                className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Globe2 className="w-4 h-4" />
                <span>{data.resourcesSection.resources[2].actionLabel}</span>
              </button>
            </div>

            {/* Resource 4: Research Paper */}
            <div className="relative rounded-[32px] sm:rounded-[36px] bg-gradient-to-br from-[#064e3b]/90 via-[#065f46]/80 to-[#042f2e]/90 backdrop-blur-2xl border border-emerald-400/30 p-8 sm:p-10 flex flex-col items-start gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all hover:border-emerald-400/50">
              <div className="space-y-3 text-left">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                  {data.resourcesSection.resources[3].title}
                </h3>
                <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
                  {data.resourcesSection.resources[3].description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsResearchModalOpen(true)}
                className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{data.resourcesSection.resources[3].actionLabel}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. WELLBEING & EMPOWERMENT PRINCIPLES (Liquid Glass iOS Cards Grid)       */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col gap-12 sm:gap-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {data.principlesSection.title}
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
              {data.principlesSection.subtitle}
            </p>
          </div>

          {/* Principles Grid (2x2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {data.principlesSection.principles.map((principle) => {
              return (
                <div
                  key={principle.id}
                  className="group relative rounded-[32px] sm:rounded-[36px] bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 hover:border-purple-500/40 p-8 sm:p-10 flex flex-col items-start gap-6 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                >
                  {/* Top 3D Icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    {principle.iconType === 'gaming' ? (
                      <WellbeingControllerIcon />
                    ) : principle.iconType === 'agency' ? (
                      <WellbeingHighFiveIcon />
                    ) : principle.iconType === 'safety' ? (
                      <WellbeingShieldHeartIcon />
                    ) : (
                      <WellbeingLotusEmpathyIcon />
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-3 text-left">
                    <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-300 transition-colors leading-snug">
                      {principle.title}
                    </h3>
                    <p className="text-base text-neutral-300 leading-relaxed font-normal">
                      {principle.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. MORE RESOURCES (Grid of 6 Featured Articles with 3D Headers)           */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col gap-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {data.moreResourcesSection.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.moreResourcesSection.articles.map((article) => (
              <div
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="group cursor-pointer flex flex-col gap-4 text-left p-4 rounded-[28px] bg-gradient-to-br from-white/[0.05] to-white/[0.01] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1.5 shadow-lg"
              >
                {/* 3D Visual Header */}
                <WellbeingArticleThumbnail type={article.thumbnailType} />

                {/* Category Tag */}
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 pt-1">
                  {article.category}
                </span>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-purple-300 transition-colors leading-snug line-clamp-2">
                  {article.title}
                </h3>

                {/* Summary */}
                <p className="text-sm text-neutral-400 leading-relaxed line-clamp-3">
                  {article.summary}
                </p>

                {/* Read More Link */}
                <div className="flex items-center gap-1.5 text-sm font-bold text-purple-400 group-hover:text-purple-300 group-hover:translate-x-1 transition-all pt-2 mt-auto">
                  <span>{data.moreResourcesSection.readMoreLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. EXPERT QUOTE SECTION (ConnectSafely Larry Magid)                       */}
        {/* ========================================================================= */}
        <section className="max-w-6xl mx-auto px-6 lg:px-12 w-full">
          <div className="relative rounded-[36px] sm:rounded-[44px] bg-gradient-to-br from-[#281b6e]/85 via-[#180f42]/90 to-[#0c0724]/95 backdrop-blur-2xl border border-white/15 p-8 sm:p-14 lg:p-16 shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col items-center justify-between min-h-[400px] overflow-hidden text-center gap-8">
            {/* Top-Left 3D Megaphone Graphic */}
            <div className="absolute top-6 left-6 hidden sm:flex pointer-events-none">
              <WellbeingMegaphoneIllustration />
            </div>

            {/* Bottom-Right 3D Cartoon Googly Eyes */}
            <div className="absolute bottom-4 right-6 hidden sm:flex pointer-events-none">
              <GooglyEyesIllustration />
            </div>

            {/* Ambient Internal Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Quotation Marks Symbol */}
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg relative z-10">
              <Quote className="w-6 h-6 fill-white text-white rotate-180" />
            </div>

            {/* Quote Text */}
            <p className="text-lg sm:text-2xl font-bold text-white leading-relaxed max-w-3xl tracking-tight relative z-10">
              {data.quoteSection.quote}
            </p>

            {/* Author & Organization */}
            <div className="flex flex-col items-center gap-3 relative z-10 pt-2">
              <ConnectSafelyLogo />
              <div className="flex flex-col text-center">
                <span className="text-base sm:text-lg font-bold text-white">
                  {data.quoteSection.author}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-neutral-300">
                  {data.quoteSection.authorRole}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. PARENT HUB SECTION                                                     */}
        {/* ========================================================================= */}
        <section className="w-full py-12 sm:py-20 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Text Content */}
            <div className="flex flex-col gap-6 order-2 lg:order-1 text-left">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {data.parentHubSection.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {data.parentHubSection.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(data.parentHubSection.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {data.parentHubSection.ctaButton}
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center order-1 lg:order-2">
              <ParentHubIllustration />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. TEEN CHARTER SECTION                                                   */}
        {/* ========================================================================= */}
        <section className="w-full py-12 sm:py-20 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Illustration */}
            <div className="flex justify-center">
              <TeenCharterIllustration />
            </div>

            {/* Right Text Content */}
            <div className="flex flex-col gap-6 text-left">
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                {data.teenCharterSection.heading}
              </h2>
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
                {data.teenCharterSection.description}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(data.teenCharterSection.link)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {data.teenCharterSection.ctaButton}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 5. GLOBAL CRISIS SUPPORT DIRECTORY MODAL                                  */}
      {/* ========================================================================= */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-[32px] bg-[#110e24] border border-purple-500/30 p-6 sm:p-10 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(false)}
              className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-12 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Globe2 className="w-3.5 h-3.5" />
                <span>24/7 Crisis Directory</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {data.globalSupportModal.title}
              </h3>
              <p className="text-sm sm:text-base text-neutral-300">
                {data.globalSupportModal.subtitle}
              </p>
            </div>

            {/* Regions List */}
            <div className="space-y-6 pt-2">
              {data.globalSupportModal.regions.map((regionGroup, idx) => (
                <div key={idx} className="space-y-3 text-left">
                  <h4 className="text-sm font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{regionGroup.region}</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {regionGroup.services.map((service, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-2xl bg-[#181335] border border-white/10 p-4 sm:p-5 flex flex-col gap-1.5"
                      >
                        <span className="text-base font-bold text-white">{service.name}</span>
                        <span className="text-sm font-black text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg w-fit border border-emerald-500/30">
                          {service.contact}
                        </span>
                        <span className="text-xs sm:text-sm text-neutral-300">{service.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Action Button */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-sm transition-all cursor-pointer"
              >
                {data.globalSupportModal.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. RESEARCH PAPER INSIGHTS MODAL                                          */}
      {/* ========================================================================= */}
      {isResearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-[32px] bg-[#110e24] border border-purple-500/30 p-6 sm:p-10 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsResearchModalOpen(false)}
              className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-3 text-left pr-10">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Adolescent Psychology & Gaming
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Promoting Well-Being Through Online Communities
              </h3>
            </div>

            <div className="space-y-4 text-left text-sm sm:text-base text-neutral-300 leading-relaxed bg-[#181335] p-6 rounded-2xl border border-white/10">
              <p>
                Our ongoing clinical study in collaboration with youth developmental psychologists
                evaluates how peer support channels, cooperative gaming, and digital boundary
                features alleviate social isolation in young adults.
              </p>
              <h4 className="font-bold text-white pt-2">Key Research Takeaways:</h4>
              <ul className="list-disc list-inside space-y-2 text-neutral-300 text-sm">
                <li>Co-op play reduces cortisol stress levels by up to 24% after school/work.</li>
                <li>
                  Voice channels with trusted friends improve emotional regulation and resilience.
                </li>
                <li>Clear status controls and do-not-disturb modes mitigate digital fatigue.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsResearchModalOpen(false)}
                className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ARTICLE DETAILS MODAL                                                  */}
      {/* ========================================================================= */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-[32px] bg-[#110e24] border border-purple-500/30 p-6 sm:p-10 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveArticle(null)}
              className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <WellbeingArticleThumbnail type={activeArticle.thumbnailType} className="h-36" />

            <div className="space-y-2 text-left pr-10">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {activeArticle.category}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {activeArticle.title}
              </h3>
            </div>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed text-left bg-[#181335] p-5 rounded-2xl border border-white/10">
              {activeArticle.summary}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default WellbeingHubPage;
