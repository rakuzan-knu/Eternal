import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Repeat,
  Share,
  Bookmark,
  Music,
  Send,
  Phone,
  Video,
  Play,
  Search,
  Bell,
  Sparkles,
  Users,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { VerifiedCheckmark } from '../../../entities/profile/ui/VerifiedCheckmark';

interface GallerySlide {
  id: string;
  title: string;
  category: string;
  renderContent: () => React.ReactNode;
}

export const CareersGallery: React.FC = () => {
  const slides: GallerySlide[] = [
    // 1. Feed & Posts Page
    {
      id: 'feed-page',
      title: 'Dynamic Feed & Real-Time Posts',
      category: 'Feed Engine',
      renderContent: () => (
        <div className="w-full h-full bg-[#090a0f] p-4 sm:p-6 flex flex-col gap-4 text-left select-none overflow-hidden font-sans">
          {/* Mock Feed Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">For You</span>
              <span className="text-sm font-semibold text-gray-500">Following</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 text-[11px] font-bold border border-purple-800/40">
                ✨ Live Updates
              </span>
            </div>
          </div>

          {/* Post Card */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5">
                  <div className="w-full h-full bg-[#120c27] rounded-full flex items-center justify-center font-bold text-xs text-white">
                    N
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white">Nikolaj Agh</span>
                    <VerifiedCheckmark isVerified={true} size="xs" />
                  </div>
                  <span className="text-[10px] text-gray-500">@nikolaj • 15m</span>
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1 rounded-full bg-white text-black font-bold text-[10px]"
              >
                Following
              </button>
            </div>

            <p className="text-xs text-neutral-200 leading-relaxed">
              Shipping the new WebRTC audio engine & dark glassmorphism design for Eternal! 🚀💜
            </p>

            {/* Media Box */}
            <div className="relative aspect-[16/9] rounded-xl bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex flex-col justify-end p-3 overflow-hidden border border-white/10">
              <div className="relative z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] w-fit font-mono border border-white/10">
                <Music className="w-3 h-3 text-purple-400 animate-pulse" />
                <span>Resonance — HOME</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center text-gray-400 text-xs pt-1 border-t border-white/[0.06]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-pink-500 font-bold">
                  <Heart size={14} className="fill-pink-500" /> 1,482
                </span>
                <span className="flex items-center gap-1 hover:text-blue-400">
                  <MessageSquare size={14} /> 128
                </span>
                <span className="flex items-center gap-1 hover:text-green-400">
                  <Repeat size={14} /> 42
                </span>
              </div>
              <Bookmark size={14} />
            </div>
          </div>
        </div>
      ),
    },

    // 2. Chat & Messenger Interface
    {
      id: 'chat-page',
      title: 'Real-Time Messenger & Voice Lounges',
      category: 'Chat System',
      renderContent: () => (
        <div className="w-full h-full bg-[#090a0f] p-4 sm:p-6 flex flex-col gap-4 text-left select-none overflow-hidden font-sans">
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                EF
              </div>
              <div>
                <span className="font-bold text-xs text-white block leading-tight">
                  Eternal Core & Devs
                </span>
                <span className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> 5 online
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-white/[0.08] text-purple-300">
                <Phone size={13} />
              </div>
              <div className="p-1.5 rounded-full bg-white/[0.08] text-purple-300">
                <Video size={13} />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3 flex-1 justify-center">
            <div className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                I
              </div>
              <div className="p-3 rounded-2xl rounded-tl-sm bg-purple-950/60 border border-purple-800/30 text-xs text-neutral-200 max-w-[80%]">
                <span className="font-bold text-purple-300 block text-[10px] mb-0.5">Ilya P.</span>
                WebSocket connection benchmark passed: 100k messages with sub-10ms latency! 🔥
              </div>
            </div>

            <div className="flex gap-2 items-start justify-end">
              <div className="p-3 rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-xs flex flex-col gap-1.5 max-w-[80%] shadow-lg">
                <span className="font-bold text-pink-200 text-[10px]">Mihal Agh</span>
                {/* Voice Note Waveform */}
                <div className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
                  <div className="w-5 h-5 rounded-full bg-white text-purple-900 flex items-center justify-center shrink-0">
                    <Play size={10} className="fill-purple-900 ml-0.5" />
                  </div>
                  <div className="flex items-center gap-0.5 h-3 flex-1">
                    <span className="w-0.5 h-2 bg-purple-300 rounded-full" />
                    <span className="w-0.5 h-3 bg-purple-200 rounded-full" />
                    <span className="w-0.5 h-1.5 bg-purple-300 rounded-full" />
                    <span className="w-0.5 h-3 bg-white rounded-full" />
                    <span className="w-0.5 h-2 bg-purple-200 rounded-full" />
                    <span className="w-0.5 h-3 bg-purple-300 rounded-full" />
                  </div>
                  <span className="text-[9px] font-mono text-purple-200">0:24</span>
                </div>
                <span>Voice notes are now synced in all rooms! 🎙️</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // 3. User Profile & Liquid Glass Customization
    {
      id: 'profile-page',
      title: 'Liquid Glass User Profile & Stats',
      category: 'Profile Engine',
      renderContent: () => (
        <div className="w-full h-full bg-[#090a0f] p-4 sm:p-6 flex flex-col gap-4 text-left select-none overflow-hidden font-sans">
          {/* Profile Card Mock */}
          <div className="relative rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 flex flex-col gap-3.5 backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-xl">
                <div className="w-full h-full bg-[#120c27] rounded-2xl flex items-center justify-center font-black text-xl text-white">
                  M
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white">Mihal Agh</span>
                  <VerifiedCheckmark isVerified={true} size="sm" />
                </div>
                <span className="text-xs text-gray-400">@mihalagh</span>
                <span className="text-[10px] text-purple-300 font-semibold mt-0.5">
                  Co-founder & Product Lead
                </span>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-2 bg-white/[0.04] rounded-xl border border-white/[0.08] p-2.5 text-center">
              <div>
                <span className="font-extrabold text-xs text-white block">24</span>
                <span className="text-[10px] text-gray-400">posts</span>
              </div>
              <div className="border-x border-white/[0.08]">
                <span className="font-extrabold text-xs text-white block">18.6K</span>
                <span className="text-[10px] text-gray-400">followers</span>
              </div>
              <div>
                <span className="font-extrabold text-xs text-white block">340</span>
                <span className="text-[10px] text-gray-400">following</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs text-center"
              >
                Edit Profile
              </button>
              <button
                type="button"
                className="py-1.5 rounded-xl bg-white/[0.08] text-white font-semibold text-xs text-center border border-white/10"
              >
                Share Profile
              </button>
            </div>
          </div>
        </div>
      ),
    },

    // 4. Search & Explore
    {
      id: 'explore-page',
      title: 'Global Search & Discovery Feed',
      category: 'Explore Engine',
      renderContent: () => (
        <div className="w-full h-full bg-[#090a0f] p-4 sm:p-6 flex flex-col gap-4 text-left select-none overflow-hidden font-sans">
          {/* Search Bar */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-xs text-neutral-300">
            <Search size={14} className="text-purple-400" />
            <span>Search people, music, and topics...</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-bold">
            <span className="px-3 py-1 rounded-full bg-purple-600 text-white shadow-md">Top</span>
            <span className="px-3 py-1 rounded-full bg-white/[0.06] text-gray-300">People</span>
            <span className="px-3 py-1 rounded-full bg-white/[0.06] text-gray-300">
              Audio Rooms
            </span>
            <span className="px-3 py-1 rounded-full bg-white/[0.06] text-gray-300">Tags</span>
          </div>

          {/* Trending Suggestions */}
          <div className="flex flex-col gap-2">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">#EternalAudio</span>
                <span className="text-[10px] text-gray-400">12.4K posts this week</span>
              </div>
              <Sparkles size={14} className="text-purple-400" />
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">#KyivTechCommunity</span>
                <span className="text-[10px] text-gray-400">8.9K active discussions</span>
              </div>
              <Users size={14} className="text-indigo-400" />
            </div>
          </div>
        </div>
      ),
    },

    // 5. Notifications & Activity Center
    {
      id: 'notifications-page',
      title: 'Real-Time Notification & Activity Center',
      category: 'Activity Center',
      renderContent: () => (
        <div className="w-full h-full bg-[#090a0f] p-4 sm:p-6 flex flex-col gap-3 text-left select-none overflow-hidden font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <span className="font-bold text-xs text-white">Activity</span>
            <span className="text-[10px] text-purple-400 font-bold">Mark all as read</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/30 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                <Heart size={13} className="fill-pink-400" />
              </div>
              <div className="text-[11px] text-neutral-200">
                <strong className="text-white">Elena Voronina</strong> liked your post
                <span className="text-[9px] text-gray-400 block">2 minutes ago</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Volume2 size={13} />
              </div>
              <div className="text-[11px] text-neutral-200">
                <strong className="text-white">Nikolaj Agh</strong> invited you to Voice Room
                <span className="text-[9px] text-gray-400 block">15 minutes ago</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                <Users size={13} />
              </div>
              <div className="text-[11px] text-neutral-200">
                <strong className="text-white">Ilya Podorozhnyi</strong> started following you
                <span className="text-[9px] text-gray-400 block">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const AUTO_SLIDE_DURATION = 4000; // 4.0s per slide

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100%

  // Drag & Swipe states (supports both Mouse Drag on PC & Touch on Mobile)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const isMouseDownRef = useRef(false);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setProgress(0);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  }, [slides.length]);

  // Robust, drift-free timestamp progress timer (eliminates double-skip bugs)
  useEffect(() => {
    if (isPaused || isDragging) return;

    const startTime = Date.now() - (progress / 100) * AUTO_SLIDE_DURATION;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = (elapsed / AUTO_SLIDE_DURATION) * 100;

      if (currentPct >= 100) {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        setProgress(0);
      } else {
        setProgress(currentPct);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [isPaused, isDragging, currentIndex, slides.length]);

  // ==========================================
  // Mouse Drag Handlers for PC Desktop
  // ==========================================
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    isMouseDownRef.current = true;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    setIsDragging(true);
    setDragOffset(0);
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || dragStartX.current === null) return;
    const diffX = e.clientX - dragStartX.current;
    setDragOffset(diffX);
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setIsDragging(false);

    if (dragOffset > 50) {
      prevSlide();
    } else if (dragOffset < -50) {
      nextSlide();
    }
    setDragOffset(0);
    dragStartX.current = null;
    dragStartY.current = null;
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleMouseLeave = () => {
    if (isMouseDownRef.current) {
      handleMouseUp();
    }
    setIsPaused(false);
  };

  // ==========================================
  // Touch Swipe Handlers for Mobile & Tablet
  // ==========================================
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setIsDragging(true);
    dragStartX.current = e.touches[0].clientX;
    dragStartY.current = e.touches[0].clientY;
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const diffX = e.touches[0].clientX - dragStartX.current;
    const diffY = e.touches[0].clientY - (dragStartY.current || 0);

    // Only apply horizontal drag if horizontal intent is dominant
    if (Math.abs(diffX) > Math.abs(diffY)) {
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffset > 40) {
      prevSlide();
    } else if (dragOffset < -40) {
      nextSlide();
    }
    setDragOffset(0);
    dragStartX.current = null;
    dragStartY.current = null;
    setTimeout(() => setIsPaused(false), 3000);
  };

  // Keyboard Arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
  };

  return (
    <div
      className="w-full max-w-6xl mx-auto flex flex-col items-center gap-3 px-4 select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Platform Showcase Carousel"
    >
      {/* Main Carousel Display Viewport with Mouse Drag & Touch Support */}
      <div
        className={`relative w-full rounded-[32px] overflow-hidden bg-gradient-to-br from-[#120f28] via-[#1a1438] to-[#07050f] border border-purple-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.8)] touch-pan-y ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Active Slide Category & Title Header with Clean Responsive Controls */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#090615]/85 border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-3 py-0.5 rounded-full bg-purple-950/80 text-purple-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-purple-800/40 shrink-0">
              {slides[currentIndex].category}
            </span>
            <span className="font-bold text-xs sm:text-sm text-white truncate hidden sm:inline">
              {slides[currentIndex].title}
            </span>
          </div>

          {/* Top-Right Controls: Morphing Dots & Progress Line */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Prev Arrow Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="Previous Slide"
              className="md:hidden p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white transition-all flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Morphing Dots: Inactive items are circular dots; Active item expands into a progress line */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-1">
              {slides.map((_, i) => {
                const isActive = i === currentIndex;
                return (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSlide(i);
                    }}
                    className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 relative overflow-hidden cursor-pointer ${
                      isActive
                        ? 'w-7 sm:w-8 bg-white/20 shadow-md'
                        : 'w-2 sm:w-2.5 bg-white/30 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    {isActive && (
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500 via-indigo-400 to-pink-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                        style={{
                          width: `${Math.min(100, Math.max(0, progress))}%`,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Next Arrow Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="Next Slide"
              className="md:hidden p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white transition-all flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Slide Content Viewport with Live Interactive Drag Offset */}
        <div
          className="w-full min-h-[360px] sm:min-h-[400px] flex items-center justify-center p-3 sm:p-8"
          style={{
            transform: isDragging ? `translateX(${dragOffset * 0.32}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div key={currentIndex} className="w-full max-w-2xl animate-fadeIn pointer-events-none">
            {slides[currentIndex].renderContent()}
          </div>
        </div>

        {/* Desktop-Only Floating Left Arrow Button (Hidden on Mobile) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 hover:bg-purple-600/90 text-white border border-white/15 backdrop-blur-md items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl z-30 cursor-pointer"
          aria-label="Previous Slide"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Desktop-Only Floating Right Arrow Button (Hidden on Mobile) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 hover:bg-purple-600/90 text-white border border-white/15 backdrop-blur-md items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl z-30 cursor-pointer"
          aria-label="Next Slide"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Subtle Gesture Hint for both Mouse Drag and Touch */}
      <span className="text-[11px] text-neutral-400/80 font-medium tracking-wide flex items-center gap-1.5 select-none pt-1">
        <span className="hidden md:inline">
          ✨ Click & drag with mouse or use arrows to explore
        </span>
        <span className="md:hidden">← Swipe to explore platform features →</span>
      </span>
    </div>
  );
};
