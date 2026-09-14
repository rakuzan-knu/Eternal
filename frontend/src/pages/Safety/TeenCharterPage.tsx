import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { TEEN_CHARTER_EN, TEEN_CHARTER_UK } from './data/teenCharterData';
import {
  TeenCharterRoundtableIllustration,
  CharterParchmentIllustration,
  TeenAuthenticityIllustration,
  TeenPrivacyIllustration,
  PuzzleCollaborationIllustration,
  BostonChildrensLogo,
  ThornNoFiltrLogo,
  ThinkYoungLogo,
} from './ui/TeenCharterIllustrations';
import {
  ThumbsUp,
  ThumbsDown,
  Users,
  Shield,
  HeartHandshake,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const TeenCharterPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? TEEN_CHARTER_UK : TEEN_CHARTER_EN;

  // Quiz state: map of scenarioId -> 'acceptable' | 'unacceptable'
  const [userAnswers, setUserAnswers] = useState<Record<string, 'acceptable' | 'unacceptable'>>({});

  // Partner Slider state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Touch Swipe Handlers for Partner Testimonials Slider
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const prevSlide = () => {
    setCurrentSlideIndex((prev) =>
      prev === 0 ? data.partnersSection.slides.length - 1 : prev - 1,
    );
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) =>
      prev === data.partnersSection.slides.length - 1 ? 0 : prev + 1,
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diffX = touchStartX.current - touchEndX.current;
      const diffY = (touchStartY.current || 0) - (touchEndY.current || 0);

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
        if (diffX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleVote = (scenarioId: string, choice: 'acceptable' | 'unacceptable') => {
    setUserAnswers((prev) => ({
      ...prev,
      [scenarioId]: choice,
    }));
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title="Teen Charter • Principles for Young Creators on Eternal"
        description={data.hero.subtitle}
        canonical="/safety/teen-charter"
        structuredData={{
          breadcrumbs: [
            { name: 'Safety', url: '/safety' },
            { name: 'Teen Charter', url: '/safety/teen-charter' },
          ],
        }}
      />
      {/* 1. Universal Top Navigation Bar */}
      <PrivacyNavbar />

      <main className="flex-1 w-full flex flex-col gap-20 sm:gap-28 pb-28">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION (With 3D Isometric Teen Collaboration Roundtable Scene)   */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#2b186d] via-[#1c0f48] via-45% via-[#120930] via-75% to-[#07050f] pt-36 pb-24 sm:pt-44 sm:pb-32 px-6 lg:px-12 flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/25 via-indigo-600/15 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto w-full relative grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Typography */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-xs font-bold uppercase tracking-wider text-purple-300 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Eternal Youth & Community</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
                {data.hero.title}
              </h1>

              <p className="text-lg sm:text-xl text-neutral-300 font-medium leading-relaxed max-w-xl">
                {data.hero.subtitle}
              </p>
            </div>

            {/* Right 3D Roundtable Graphic */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end z-10">
              <TeenCharterRoundtableIllustration />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. INTRO SECTION (Liquid Glass iOS 26.6 Card)                             */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="relative rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/15 p-8 sm:p-12 lg:p-16 shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col lg:flex-row items-center gap-10 lg:gap-16 overflow-hidden">
            {/* Ambient Internal Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Left 3D Scrolled Parchment Graphic */}
            <div className="flex-1 flex justify-center w-full max-w-md">
              <CharterParchmentIllustration />
            </div>

            {/* Right Text Content */}
            <div className="flex-1 flex flex-col gap-6 text-left relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                {data.introSection.heading}
              </h2>

              <p className="text-base sm:text-lg text-purple-200/90 font-medium leading-relaxed">
                {data.introSection.paragraph1}
              </p>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
                {data.introSection.paragraph2}
              </p>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-semibold text-purple-300">
                {data.introSection.paragraph3}
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. TEEN CHARTER CORE PILLARS (Liquid Glass Cards Grid)                   */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col gap-12 sm:gap-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {data.charterSection.title}
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
              {data.charterSection.subtitle}
            </p>
          </div>

          {/* 4 Pillars Grid (2x2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {data.charterSection.pillars.map((pillar) => {
              return (
                <div
                  key={pillar.id}
                  className="group relative rounded-[32px] sm:rounded-[36px] bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 hover:border-purple-500/40 p-8 sm:p-10 flex flex-col items-start gap-6 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                >
                  {/* Top 3D Visual Artwork */}
                  <div className="w-full flex justify-center py-2">
                    {pillar.id === 'authenticity' ? (
                      <TeenAuthenticityIllustration />
                    ) : pillar.id === 'privacy' ? (
                      <TeenPrivacyIllustration />
                    ) : pillar.id === 'respect' ? (
                      <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center shadow-xl">
                        <HeartHandshake className="w-24 h-24 text-pink-400 drop-shadow-[0_10px_20px_rgba(244,63,94,0.5)]" />
                      </div>
                    ) : (
                      <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-amber-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center shadow-xl">
                        <Sliders className="w-24 h-24 text-amber-400 drop-shadow-[0_10px_20px_rgba(251,191,36,0.5)]" />
                      </div>
                    )}
                  </div>

                  {/* Badge Tag */}
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 text-purple-300 border border-white/15">
                    • {pillar.badge}
                  </span>

                  {/* Title & Description */}
                  <div className="space-y-3">
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white group-hover:text-purple-300 transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-base text-neutral-300 leading-relaxed font-normal">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. IT TAKES A VILLAGE SECTION                                             */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Heading & 3D Puzzle Illustration */}
            <div className="lg:col-span-6 flex flex-col gap-8 text-left">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  {data.villageSection.title}
                </h2>
                <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-medium">
                  {data.villageSection.description}
                </p>
              </div>

              {/* 3D Puzzle Graphic */}
              <div className="flex justify-center lg:justify-start">
                <PuzzleCollaborationIllustration />
              </div>
            </div>

            {/* Right Column: Liquid Glass Points */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              {/* Point 1: Moderators */}
              <div className="rounded-[28px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 sm:p-8 flex items-start gap-5 shadow-lg">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-md">
                  <Users className="w-6 h-6 text-purple-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">
                    {data.villageSection.point1.title}
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                    {data.villageSection.point1.text}
                  </p>
                </div>
              </div>

              {/* Point 2: Proactive Safety Tools */}
              <div className="rounded-[28px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 sm:p-8 flex items-start gap-5 shadow-lg">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-md">
                  <Shield className="w-6 h-6 text-indigo-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">
                    {data.villageSection.point2.title}
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                    {data.villageSection.point2.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. INTERACTIVE QUIZ SECTION: RECOGNIZING POOR FORM                        */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col gap-10">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {data.quizSection.title}
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
              {data.quizSection.subtitle}
            </p>
          </div>

          {/* Quiz Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {data.quizSection.scenarios.map((scenario) => {
              const currentVote = userAnswers[scenario.id];
              const isAnswered = Boolean(currentVote);
              const isCorrect = currentVote === scenario.correctAnswer;

              return (
                <div
                  key={scenario.id}
                  className="rounded-[32px] bg-gradient-to-b from-[#14102c] via-[#100d24] to-[#0a0818] border border-white/10 p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-2xl relative overflow-hidden"
                >
                  {/* Scenario Question */}
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {scenario.question}
                  </h3>

                  {/* Mock Chat / Profile Window */}
                  <div className="rounded-2xl bg-[#090714] border border-white/10 p-4 sm:p-5 flex flex-col gap-3 font-sans text-xs sm:text-sm">
                    {scenario.channelName && (
                      <div className="text-neutral-400 font-bold flex items-center gap-1.5 pb-2 border-b border-white/10">
                        <span>#</span>
                        <span>{scenario.channelName}</span>
                      </div>
                    )}

                    {/* Messages */}
                    {scenario.messages && (
                      <div className="flex flex-col gap-3">
                        {scenario.messages.map((msg, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow"
                              style={{ backgroundColor: msg.avatarBg }}
                            >
                              {msg.author[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs">{msg.author}</span>
                              <span className="text-neutral-300">{msg.text}</span>
                              {msg.isMedia && (
                                <div className="mt-2 rounded-xl bg-purple-950/60 border border-purple-500/30 p-4 flex items-center justify-center text-purple-300 font-bold gap-2">
                                  <Sparkles className="w-4 h-4" />
                                  <span>{msg.mediaCaption}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Profile Mock */}
                    {scenario.profileData && (
                      <div className="flex flex-col gap-2 p-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center font-black text-white text-base">
                            ?
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {scenario.profileData.username}
                            </div>
                            <div className="text-neutral-400 text-xs">
                              {scenario.profileData.mutuals}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 p-2.5 rounded-xl bg-white/5 text-rose-300 text-xs">
                          {scenario.profileData.tagline}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive Voting Buttons & Explanation State */}
                  {!isAnswered ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleVote(scenario.id, 'acceptable')}
                        className="flex-1 py-3 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer hover:shadow-lg"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{data.quizSection.acceptableBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVote(scenario.id, 'unacceptable')}
                        className="flex-1 py-3 rounded-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer hover:shadow-lg"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>{data.quizSection.unacceptableBtn}</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-2xl border flex flex-col gap-2 animate-fadeIn ${
                        isCorrect
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                        <span>
                          {isCorrect
                            ? scenario.explanation.correctTitle
                            : scenario.explanation.incorrectTitle}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                        {scenario.explanation.reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reset Quiz Button */}
          {Object.keys(userAnswers).length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleResetQuiz}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{data.quizSection.resetQuizBtn}</span>
              </button>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 6. PARTNER TESTIMONIALS SLIDER (Liquid Glass iOS 26.6 Carousel)           */}
        {/* ========================================================================= */}
        <section className="max-w-6xl mx-auto px-6 lg:px-12 w-full">
          <div
            className="relative rounded-[36px] sm:rounded-[44px] bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.01] backdrop-blur-2xl border border-white/15 p-6 sm:p-14 lg:p-16 shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col items-center justify-between min-h-[380px] sm:min-h-[420px] overflow-hidden touch-pan-y select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Ambient Internal Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Desktop Left Navigation Arrow (Hidden on Mobile) */}
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous partner slide"
              className="hidden md:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md items-center justify-center text-white transition-all shadow-xl z-20 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Desktop Right Navigation Arrow (Hidden on Mobile) */}
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next partner slide"
              className="hidden md:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md items-center justify-center text-white transition-all shadow-xl z-20 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Slide Content */}
            <div className="w-full flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-16 lg:px-24 gap-6 sm:gap-8 relative z-10 animate-fadeIn">
              {/* Partner Logo */}
              <div className="flex justify-center items-center">
                {data.partnersSection.slides[currentSlideIndex].partnerKey === 'boston' ? (
                  <BostonChildrensLogo />
                ) : data.partnersSection.slides[currentSlideIndex].partnerKey === 'thorn' ? (
                  <ThornNoFiltrLogo />
                ) : (
                  <ThinkYoungLogo />
                )}
              </div>

              {/* Partner Description */}
              <p className="text-sm sm:text-base md:text-lg text-neutral-200 font-normal leading-relaxed max-w-3xl">
                {data.partnersSection.slides[currentSlideIndex].description}
              </p>

              {/* Optional Link */}
              {data.partnersSection.slides[currentSlideIndex].linkUrl && (
                <a
                  href={data.partnersSection.slides[currentSlideIndex].linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-purple-300 hover:text-white underline underline-offset-4 transition-colors"
                >
                  <span>{data.partnersSection.slides[currentSlideIndex].linkText}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Bottom Controls Bar (Dots + Mobile Arrows) */}
            <div className="flex flex-col items-center gap-2 pt-6 relative z-10">
              <div className="flex items-center justify-center gap-2.5">
                {/* Mobile Prev Button */}
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous partner slide"
                  className="md:hidden p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Dot Pagination */}
                <div className="flex items-center gap-2">
                  {data.partnersSection.slides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        idx === currentSlideIndex
                          ? 'w-7 h-2.5 bg-white shadow-md'
                          : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Mobile Next Button */}
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next partner slide"
                  className="md:hidden p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Mobile Gesture Hint */}
              <span className="md:hidden text-[10px] text-neutral-400 font-medium tracking-wide select-none">
                ← Swipe left/right →
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default TeenCharterPage;
