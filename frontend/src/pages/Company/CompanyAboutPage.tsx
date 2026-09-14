import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { ABOUT_TRANSLATIONS } from './data/aboutTranslations';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { useAuthStore } from '../../shared/model/useAuthStore';
import {
  DropdownSafetyMascot,
  DropdownSupportMascot,
  DropdownDeveloperMascot,
} from '../Privacy/ui/PrivacyIllustrations';
import { EternalCoin3D, EternalCrown3D, HeroSafetyOrb } from './ui/CompanyIllustrations';
import { VerifiedCheckmark } from '../../entities/profile/ui/VerifiedCheckmark';
import {
  Heart,
  MessageSquare,
  Repeat,
  Share,
  Bookmark,
  Music,
  Send,
  AtSign,
  Play,
  FileText,
  Pin,
  Phone,
  Video,
  Sparkles,
  Wifi,
  Signal,
} from 'lucide-react';

export const CompanyAboutPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { currentLanguage } = useLanguageStore();
  const t = ABOUT_TRANSLATIONS[currentLanguage] || ABOUT_TRANSLATIONS.English;

  // Timeline Scroll Progress Tracker & Parallax
  const timelineRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [crownOffset, setCrownOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Crown smooth parallax offset (moves down a few pixels with scroll, 1:1 Discord style)
      setCrownOffset(Math.min(window.scrollY * 0.08, 45));

      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeight = rect.height;

      // Start filling when the timeline hits 70% of the viewport, finish when bottom is passed
      const start = windowHeight * 0.7;
      const current = start - rect.top;
      const progress = Math.min(Math.max(current / totalHeight, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#07050f] text-white font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden">
      <SEOHead
        title="About Eternal • Our Mission, Journey & Vision"
        description={t.subtitle}
        canonical="/about"
        structuredData={{
          type: 'Organization',
          breadcrumbs: [{ name: 'About Eternal', url: '/about' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Hero Section (Deep Indigo/Purple Discord Style) */}
      <section className="relative pt-36 pb-20 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/25 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          {/* Floating Mascots on Left and Right of Hero (Visible on wide screens without overlapping text) */}
          <div className="hidden xl:block absolute -left-10 2xl:left-0 top-6 select-none pointer-events-none">
            <HeroSafetyOrb className="w-36 h-36 lg:w-44 lg:h-44" />
          </div>

          <div
            className="hidden xl:block absolute -right-10 2xl:right-0 top-6 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${crownOffset}px)` }}
          >
            <EternalCoin3D className="w-36 h-36 lg:w-44 lg:h-44" animated={true} />
          </div>

          {/* Large Hero Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight uppercase mb-6 drop-shadow-2xl">
            {t.title}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-neutral-200/90 max-w-3xl leading-relaxed mb-16 font-medium">
            {t.subtitle}
          </p>

          {/* Visual Platform Showcase Stage */}
          <div className="w-full max-w-6xl rounded-[36px] bg-gradient-to-br from-[#531eb4] via-[#6d28d9] to-[#8b5cf6] p-4 sm:p-8 lg:p-12 shadow-[0_30px_90px_rgba(88,28,135,0.6)] border border-purple-400/30 relative overflow-visible">
            {/* Ambient Lighting & Backdrop Elements */}
            <div className="absolute inset-0 bg-radial-gradient opacity-50 pointer-events-none" />

            {/* 3D White/Silver Pink Gem Crown with Smooth Scroll Parallax (1:1 Discord Style) */}
            <div
              className="absolute -top-12 -right-4 sm:-right-8 select-none pointer-events-none z-30 transition-transform duration-100 ease-out"
              style={{ transform: `translateY(${crownOffset}px) rotate(8deg)` }}
            >
              <EternalCrown3D className="w-32 h-32 sm:w-44 sm:h-44" />
            </div>

            {/* 3D Developer Mascot on Top Left */}
            <div className="absolute -top-8 -left-6 select-none pointer-events-none z-30">
              <DropdownDeveloperMascot className="w-28 h-28 sm:w-36 sm:h-36" />
            </div>

            {/* Platform Previews Stage Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center relative z-20">
              {/* 1. Left Card: Exact MiniProfileHoverCard Design */}
              <div className="hidden xl:flex xl:col-span-3 flex-col">
                <div className="w-[280px] xl:w-[310px] rounded-[26px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] border border-white/[0.14] bg-[#090a0f]/85 backdrop-blur-2xl text-left select-none relative p-4 flex flex-col gap-3 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                  {/* Ambient Banner Gradient Overlay */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[26px] -z-10">
                    <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-indigo-950/30 to-[#090a0f]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#090a0f]/75 to-[#090a0f]/95" />
                  </div>

                  {/* Header: Avatar + Username + Verified Badge + Handle Pill */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-lg">
                        <div className="w-full h-full bg-[#120c27] rounded-full flex items-center justify-center font-black text-base text-white">
                          N
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate">Nikolaj Agh</span>
                        <VerifiedCheckmark isVerified={true} size="xs" />
                      </div>

                      {/* Handle Pill */}
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] text-gray-300 font-medium">
                          <AtSign size={10} className="text-gray-400" />
                          <span>nikolaj</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-[11px] text-gray-200 line-clamp-2 leading-relaxed px-0.5">
                    {t.previewProfileBio}
                  </p>

                  {/* Liquid Glass Statistics Bar */}
                  <div className="grid grid-cols-3 gap-1.5 bg-white/[0.04] backdrop-blur-md rounded-2xl border border-white/[0.08] p-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex flex-col items-center">
                      <span className="font-extrabold text-xs text-white tracking-tight">12</span>
                      <span className="text-[10px] text-gray-400 font-medium">posts</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-white/[0.06]">
                      <span className="font-extrabold text-xs text-white tracking-tight">
                        14.2K
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">followers</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-extrabold text-xs text-white tracking-tight">284</span>
                      <span className="text-[10px] text-gray-400 font-medium">following</span>
                    </div>
                  </div>

                  {/* 3 Most Recent Posts Grid */}
                  <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden border border-white/[0.06] bg-black/35 backdrop-blur-md p-1">
                    {/* Post 1: Video */}
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 border border-white/[0.04] flex items-center justify-center">
                      <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm rounded-sm p-0.5 text-white">
                        <Play size={8} className="fill-white" />
                      </div>
                      <span className="text-[9px] text-purple-200 font-bold">Reel</span>
                    </div>

                    {/* Post 2: Text preview */}
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-1.5 flex flex-col justify-between text-left">
                      <FileText size={10} className="text-purple-400 opacity-80" />
                      <p className="text-[8px] text-gray-300 line-clamp-2 leading-tight font-medium">
                        Big update coming! 🚀
                      </p>
                    </div>

                    {/* Post 3: Photo with likes */}
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-gradient-to-br from-pink-900 to-purple-900 border border-white/[0.04] flex items-end p-1">
                      <span className="text-[8px] text-white font-bold flex items-center gap-0.5">
                        ❤️ 3.4K
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Message & Following */}
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-[11px] shadow-md shadow-blue-500/20"
                    >
                      <Send size={11} className="fill-white" />
                      <span>Message</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center py-1.5 px-2 rounded-xl font-semibold text-[11px] bg-white/[0.08] text-white border border-white/[0.1]"
                    >
                      Following
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Center Main Element: Smartphone with 1:1 iPhone Dynamic Island Status Bar & PostCard.tsx Design */}
              <div className="xl:col-span-6 flex justify-center">
                <div className="w-full max-w-[340px] sm:max-w-[380px] bg-[#0c091e] rounded-[38px] border-4 border-purple-300/30 shadow-[0_30px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col transform hover:scale-[1.02] transition-transform duration-300">
                  {/* 1:1 iPhone Top Status Bar with Dynamic Island */}
                  <div className="px-6 pt-3 pb-2.5 bg-[#090615] flex items-center justify-between border-b border-purple-900/40 text-[12px] font-semibold text-neutral-200">
                    {/* Time */}
                    <span className="tracking-tight font-medium">9:41</span>

                    {/* Dynamic Island (Pill with camera dot) */}
                    <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end pr-2 border border-white/[0.08] shadow-inner">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a24] border border-white/10" />
                    </div>

                    {/* Cellular, Wi-Fi & Battery Status Icons */}
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      {/* Cellular 4 bars */}
                      <Signal size={13} className="text-neutral-200" />
                      {/* Wi-Fi */}
                      <Wifi size={13} className="text-neutral-200" />
                      {/* Battery Pill */}
                      <div className="w-5 h-2.5 border border-neutral-300 rounded-[4px] p-0.5 flex items-center">
                        <div className="w-full h-full bg-white rounded-[2px]" />
                      </div>
                    </div>
                  </div>

                  {/* PostCard.tsx Component Structure */}
                  <div className="p-4 bg-[#090a0f]/95 flex flex-col gap-3 text-left">
                    {/* Pinned Post Indicator */}
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-semibold mb-0.5">
                      <Pin size={11} className="text-purple-400 fill-purple-400/20" />
                      <span>Pinned post</span>
                    </div>

                    {/* Post Author Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-md">
                          <div className="w-full h-full bg-[#1e1438] rounded-full flex items-center justify-center text-xs font-bold text-white">
                            M
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs text-white truncate">
                              {t.previewFeedUser}
                            </span>
                            <VerifiedCheckmark isVerified={true} size="xs" />
                          </div>
                          <span className="text-[10px] text-gray-500">@mihalagh • 2h</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full bg-white text-black font-bold text-[11px] hover:bg-neutral-200 transition-colors shadow-sm"
                      >
                        Follow
                      </button>
                    </div>

                    {/* Caption */}
                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {t.previewFeedCaption}
                    </p>

                    {/* Post Media Viewport */}
                    <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col justify-end p-3 overflow-hidden border border-white/[0.08] shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Interactive Music Player Chip */}
                      <div className="relative z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] w-fit font-mono border border-white/10">
                        <Music className="w-3 h-3 text-purple-400 animate-pulse" />
                        <span>{t.previewFeedMusic}</span>
                      </div>
                    </div>

                    {/* PostCard Action Buttons */}
                    <div className="flex justify-between items-center text-gray-400 text-xs pt-1 border-t border-white/[0.06]">
                      <div className="flex items-center gap-4">
                        {/* Like Button */}
                        <div className="flex items-center gap-1 text-pink-500 font-bold">
                          <Heart size={15} className="fill-pink-500 text-pink-500" />
                          <span>4,829</span>
                        </div>

                        {/* Comment Button */}
                        <div className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                          <MessageSquare size={15} />
                          <span>312</span>
                        </div>

                        {/* Repost Button */}
                        <div className="flex items-center gap-1 hover:text-green-400 transition-colors">
                          <Repeat size={15} />
                          <span>84</span>
                        </div>

                        {/* Share Button */}
                        <Share size={15} className="hover:text-purple-400 transition-colors" />
                      </div>

                      {/* Bookmark Button */}
                      <Bookmark size={15} className="hover:text-yellow-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Right Card: Messenger Chat Preview (Clean, Aligned, Voice Note, Phone & Video Call Icons) */}
              <div className="hidden xl:flex xl:col-span-3 flex-col">
                <div className="w-[280px] xl:w-[310px] rounded-[26px] bg-[#090a0f]/85 border border-white/[0.14] backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-4 flex flex-col gap-3 text-left transform rotate-2 hover:rotate-0 transition-transform duration-300">
                  {/* Chat Header: Avatar Collage + Clean Title "Eternal friends" + Phone & Video Buttons */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar Collage of 3 Group Members */}
                      <div className="relative w-8 h-8 shrink-0">
                        <div className="absolute top-0 left-0 w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 border border-[#090a0f] flex items-center justify-center text-[8px] font-bold text-white z-20">
                          M
                        </div>
                        <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 border border-[#090a0f] flex items-center justify-center text-[8px] font-bold text-white z-10">
                          N
                        </div>
                        <div className="absolute bottom-0 left-1.5 w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 border border-[#090a0f] flex items-center justify-center text-[8px] font-bold text-white z-30">
                          I
                        </div>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-white truncate">
                          Eternal friends
                        </span>
                        <span className="text-[10px] text-purple-300">3 members active</span>
                      </div>
                    </div>

                    {/* Phone & Video Call Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.1] flex items-center justify-center text-white transition-colors"
                        title="Voice Call"
                      >
                        <Phone size={12} className="text-purple-300" />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.1] flex items-center justify-center text-white transition-colors"
                        title="Video Call"
                      >
                        <Video size={12} className="text-purple-300" />
                      </button>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex flex-col gap-2.5">
                    {/* Message 1: Alex */}
                    <div className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        I
                      </div>
                      <div className="p-2.5 rounded-2xl rounded-tl-sm bg-purple-950/60 border border-purple-800/30 text-[11px] text-neutral-200">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-purple-300 text-[10px]">Ilya P.</span>
                          <span className="text-[9px] text-gray-500">14:22</span>
                        </div>
                        {t.previewChatMsg1}
                      </div>
                    </div>

                    {/* Message 2: Nikolaj Audio Wave Note */}
                    <div className="flex gap-2 items-start justify-end">
                      <div className="p-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-[11px] flex flex-col gap-1.5 shadow-md max-w-[220px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-pink-200 text-[10px]">Nikolaj</span>
                          <span className="text-[9px] text-purple-200 opacity-75">14:24</span>
                        </div>

                        {/* Audio Wave Note Player */}
                        <div className="flex items-center gap-2 bg-black/30 rounded-full px-2.5 py-1">
                          <div className="w-5 h-5 rounded-full bg-white text-purple-900 flex items-center justify-center shrink-0 shadow-sm">
                            <Play size={10} className="fill-purple-900 ml-0.5" />
                          </div>
                          {/* Animated Waveform Bars */}
                          <div className="flex items-center gap-0.5 h-3 flex-1">
                            <span className="w-0.5 h-2 bg-purple-300 rounded-full" />
                            <span className="w-0.5 h-3 bg-purple-200 rounded-full" />
                            <span className="w-0.5 h-1.5 bg-purple-300 rounded-full" />
                            <span className="w-0.5 h-2.5 bg-white rounded-full" />
                            <span className="w-0.5 h-3 bg-purple-200 rounded-full" />
                            <span className="w-0.5 h-1.5 bg-purple-300 rounded-full" />
                            <span className="w-0.5 h-2 bg-white rounded-full" />
                          </div>
                          <span className="text-[9px] font-mono text-purple-200">0:18</span>
                        </div>

                        <span className="text-[10px] text-neutral-100">{t.previewChatMsg2}</span>
                      </div>
                    </div>
                  </div>

                  {/* Typing indicator */}
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono pt-1 border-t border-white/[0.04]">
                    <div className="flex gap-0.5">
                      <span
                        className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span>{t.previewChatTyping}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Eternal Story Section (Center Scroll-Linked Interactive Timeline) */}
      <section className="py-24 px-6 lg:px-12 max-w-5xl mx-auto w-full relative z-10">
        {/* Story Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4">
            {t.storyTitle}
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            {t.storySubtitle}
          </p>
        </div>

        {/* Timeline Container with Center Filling Line */}
        <div ref={timelineRef} className="relative flex flex-col gap-14 md:gap-24 select-text">
          {/* Base Background Track Line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-neutral-800/80 rounded-full z-0 pointer-events-none" />

          {/* Dynamic Glowing Filled Progress Line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 w-1 bg-gradient-to-b from-purple-500 via-pink-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-all duration-150 z-0 pointer-events-none"
            style={{ height: `${scrollProgress * 100}%` }}
          />

          {/* Floating Glowing Progress Orb Node (Desktop Smooth Center Traveling Slider) */}
          <div
            className="hidden md:block absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-4 border-purple-600 shadow-[0_0_20px_#ffffff] transition-all duration-150 -translate-y-3 z-30 pointer-events-none"
            style={{ top: `${scrollProgress * 100}%` }}
          />

          {/* Milestone 1: June 2026 */}
          <div className="relative z-10 flex flex-col items-center md:grid md:grid-cols-2 md:gap-12 lg:gap-16 md:items-center">
            {/* Mobile Top Node Dot (Discord Style above card) */}
            <div className="md:hidden flex items-center justify-center w-7 h-7 rounded-full bg-white border-4 border-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.6)] mb-5 z-20 shrink-0" />

            {/* Card on Left (Desktop) / Centered (Mobile) */}
            <div className="w-full max-w-[440px] md:max-w-none p-6 sm:p-8 rounded-[28px] sm:rounded-3xl bg-[#0e0a1f] border border-purple-800/40 backdrop-blur-xl shadow-2xl flex flex-col gap-3 md:text-right relative z-10 overflow-visible text-left">
              {/* Mobile Perched Mascot on Top-Right of Card (Discord Style) */}
              <div className="md:hidden absolute -top-11 -right-3 sm:-right-4 w-24 h-24 pointer-events-none select-none z-20 drop-shadow-2xl">
                <DropdownDeveloperMascot className="w-full h-full" />
              </div>

              <span className="px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 text-xs font-bold uppercase tracking-wider w-fit md:ml-auto border border-purple-800/40">
                {t.milestones[0].badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                {t.milestones[0].date}
              </h3>
              <h4 className="text-base font-bold text-purple-300">{t.milestones[0].title}</h4>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {t.milestones[0].description}
              </p>
            </div>

            {/* Desktop Mascot on Right */}
            <div className="hidden md:flex justify-start pl-8 items-center relative z-10">
              <DropdownDeveloperMascot className="w-36 h-36 lg:w-48 lg:h-48 drop-shadow-2xl" />
            </div>
          </div>

          {/* Milestone 2: July 2026 */}
          <div className="relative z-10 flex flex-col items-center md:grid md:grid-cols-2 md:gap-12 lg:gap-16 md:items-center">
            {/* Mobile Top Node Dot (Discord Style above card) */}
            <div className="md:hidden flex items-center justify-center w-7 h-7 rounded-full bg-white border-4 border-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.6)] mb-5 z-20 shrink-0" />

            {/* Desktop Mascot on Left */}
            <div className="hidden md:flex justify-end pr-8 items-center relative z-10 order-1">
              <DropdownSupportMascot className="w-36 h-36 lg:w-48 lg:h-48 drop-shadow-2xl" />
            </div>

            {/* Card on Right (Desktop) / Centered (Mobile) */}
            <div className="w-full max-w-[440px] md:max-w-none p-6 sm:p-8 rounded-[28px] sm:rounded-3xl bg-[#0e0a1f] border border-purple-800/40 backdrop-blur-xl shadow-2xl flex flex-col gap-3 text-left relative z-10 overflow-visible order-2">
              {/* Mobile Perched Mascot on Top-Right of Card (Discord Style) */}
              <div className="md:hidden absolute -top-11 -right-3 sm:-right-4 w-24 h-24 pointer-events-none select-none z-20 drop-shadow-2xl">
                <DropdownSupportMascot className="w-full h-full" />
              </div>

              <span className="px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 text-xs font-bold uppercase tracking-wider w-fit border border-purple-800/40">
                {t.milestones[1].badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                {t.milestones[1].date}
              </h3>
              <h4 className="text-base font-bold text-purple-300">{t.milestones[1].title}</h4>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {t.milestones[1].description}
              </p>
            </div>
          </div>

          {/* Milestone 3: August 2026 */}
          <div className="relative z-10 flex flex-col items-center md:grid md:grid-cols-2 md:gap-12 lg:gap-16 md:items-center">
            {/* Mobile Top Node Dot (Discord Style above card) */}
            <div className="md:hidden flex items-center justify-center w-7 h-7 rounded-full bg-white border-4 border-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.6)] mb-5 z-20 shrink-0" />

            {/* Card on Left (Desktop) / Centered (Mobile) */}
            <div className="w-full max-w-[440px] md:max-w-none p-6 sm:p-8 rounded-[28px] sm:rounded-3xl bg-[#0e0a1f] border border-purple-800/40 backdrop-blur-xl shadow-2xl flex flex-col gap-3 md:text-right relative z-10 overflow-visible text-left">
              {/* Mobile Perched Mascot on Top-Right of Card (Discord Style) */}
              <div className="md:hidden absolute -top-11 -right-3 sm:-right-4 w-24 h-24 pointer-events-none select-none z-20 drop-shadow-2xl">
                <DropdownSafetyMascot className="w-full h-full" />
              </div>

              <span className="px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 text-xs font-bold uppercase tracking-wider w-fit md:ml-auto border border-purple-800/40">
                {t.milestones[2].badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                {t.milestones[2].date}
              </h3>
              <h4 className="text-base font-bold text-purple-300">{t.milestones[2].title}</h4>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {t.milestones[2].description}
              </p>
            </div>

            {/* Desktop Mascot on Right */}
            <div className="hidden md:flex justify-start pl-8 items-center relative z-10">
              <DropdownSafetyMascot className="w-36 h-36 lg:w-48 lg:h-48 drop-shadow-2xl" />
            </div>
          </div>
        </div>

        {/* Future Vision Section ("2026 AND ON...") */}
        <div className="mt-32 text-center flex flex-col items-center gap-6 relative z-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase">
            {t.futureHeading}
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed">
            {t.futureDescription}
          </p>

          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/' : '/privacy')}
            className="mt-4 px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold tracking-wide shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{t.joinButton}</span>
          </button>
        </div>
      </section>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default CompanyAboutPage;
