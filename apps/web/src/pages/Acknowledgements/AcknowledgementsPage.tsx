import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '@/widgets/footer';
import { SEOHead } from '../../shared/seo';
import { OPEN_SOURCE_LIBRARIES } from './data/acknowledgementsData';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { sanitizeExternalUrl } from '../../shared/lib/urlSecurity';
import {
  ExternalLink,
  Pause,
  Play,
  Search,
  Sparkles,
  Terminal,
  Gauge,
  ChevronDown,
  X,
} from 'lucide-react';

const SPEED_PRESETS = [
  { value: 0.5, labelEn: 'Slow', labelUk: 'Повільно' },
  { value: 1.0, labelEn: 'Normal', labelUk: 'Звичайно' },
  { value: 1.2, labelEn: 'Medium', labelUk: 'Помірно' },
  { value: 1.5, labelEn: 'Fast', labelUk: 'Швидко' },
  { value: 1.7, labelEn: 'Very fast', labelUk: 'Дуже швидко' },
  { value: 2.0, labelEn: 'Super fast', labelUk: 'Максимально' },
];

const TRANSLATIONS: Record<
  string,
  {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    pause: string;
    resume: string;
    speed: string;
    all: string;
    viewLicenses: string;
    noResults: string;
  }
> = {
  English: {
    title: 'ACKNOWLEDGEMENTS',
    subtitle: 'These are the open source libraries we use to make Eternal:',
    searchPlaceholder: 'Search open source libraries...',
    pause: 'Pause',
    resume: 'Auto Scroll',
    speed: 'Speed',
    all: 'All Categories',
    viewLicenses: 'View Terms of Service',
    noResults: 'No libraries found matching your search query.',
  },
  Українська: {
    title: 'ПОДЯКИ ВІДКРИТОМУ КОДУ',
    subtitle: 'Ось бібліотеки з відкритим кодом, які ми використовуємо для створення Eternal:',
    searchPlaceholder: 'Пошук бібліотек...',
    pause: 'Пауза',
    resume: 'Автопрокрутка',
    speed: 'Швидкість',
    all: 'Всі категорії',
    viewLicenses: 'Переглянути умови',
    noResults: 'Бібліотек за вашим запитом не знайдено.',
  },
  Deutsch: {
    title: 'DANKSAGUNGEN',
    subtitle: 'Dies sind die Open-Source-Bibliotheken, die wir für Eternal verwenden:',
    searchPlaceholder: 'Bibliotheken suchen...',
    pause: 'Pause',
    resume: 'Auto-Scroll',
    speed: 'Tempo',
    all: 'Alle',
    viewLicenses: 'Nutzungsbedingungen',
    noResults: 'Keine Bibliotheken gefunden.',
  },
  Español: {
    title: 'AGRADECIMIENTOS',
    subtitle: 'Estas son las bibliotecas de código abierto que utilizamos en Eternal:',
    searchPlaceholder: 'Buscar librerías...',
    pause: 'Pausar',
    resume: 'Desplazamiento automático',
    speed: 'Velocidad',
    all: 'Todas',
    viewLicenses: 'Ver Términos',
    noResults: 'No se encontraron librerías.',
  },
  Français: {
    title: 'REMERCIEMENTS',
    subtitle: 'Voici les bibliothèques open source que nous utilisons pour créer Eternal :',
    searchPlaceholder: 'Rechercher des bibliothèques...',
    pause: 'Pause',
    resume: 'Défilement automatique',
    speed: 'Vitesse',
    all: 'Toutes',
    viewLicenses: 'Conditions d’utilisation',
    noResults: 'Aucune bibliothèque trouvée.',
  },
};

export const AcknowledgementsPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.English;
  const isUk = currentLanguage === 'Українська';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  const speedMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const categories = useMemo(() => {
    return [
      'All',
      'Frontend & UI',
      'Backend & Server',
      'Realtime & Media',
      'Database & Storage',
      'Tooling & Testing',
    ];
  }, []);

  const isFiltered = searchQuery.trim().length > 0 || selectedCategory !== 'All';

  const filteredLibraries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return OPEN_SOURCE_LIBRARIES.filter((lib) => {
      const matchesSearch =
        query === '' ||
        lib.name.toLowerCase().includes(query) ||
        lib.description.toLowerCase().includes(query) ||
        lib.category.toLowerCase().includes(query) ||
        lib.license.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'All' || lib.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const scrollPosRef = useRef<number>(0);
  const lastTimestampRef = useRef<number | null>(null);

  // Sync scroll accumulator when user manually scrolls
  const handleUserScroll = () => {
    if (scrollContainerRef.current && (isHovered || isPaused)) {
      scrollPosRef.current = scrollContainerRef.current.scrollTop;
    }
  };

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };

    if (isSpeedMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSpeedMenuOpen]);

  // Delta-time based smooth auto-scrolling engine (frame-rate independent)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Base speed: 45 pixels per second at 1.0x
    const basePixelsPerSecond = 50;
    const pixelsPerSecond = basePixelsPerSecond * speedMultiplier;

    const scrollLoop = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSeconds = Math.min((timestamp - lastTimestampRef.current) / 1000, 0.1);
      lastTimestampRef.current = timestamp;

      if (!isPaused && !isHovered && container) {
        // Only scroll if content height exceeds container viewport
        if (container.scrollHeight > container.clientHeight + 10) {
          scrollPosRef.current += pixelsPerSecond * deltaSeconds;

          if (!isFiltered) {
            // Seamless loop for full catalog (wraps at half height)
            const halfScroll = container.scrollHeight / 2;
            if (scrollPosRef.current >= halfScroll) {
              scrollPosRef.current = scrollPosRef.current % halfScroll;
            }
          } else {
            // In filtered mode, loop when reaching the end
            const maxScroll = container.scrollHeight - container.clientHeight;
            if (scrollPosRef.current >= maxScroll + 10) {
              scrollPosRef.current = 0;
            }
          }

          container.scrollTop = scrollPosRef.current;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scrollLoop);
    };

    lastTimestampRef.current = null;
    animFrameIdRef.current = requestAnimationFrame(scrollLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPaused, isHovered, speedMultiplier, isFiltered, filteredLibraries]);

  const handleLibraryClick = (url: string) => {
    const safeUrl = sanitizeExternalUrl(url);
    if (safeUrl) {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-[#E0E0E6] font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between">
      <SEOHead
        title={t.title || 'Acknowledgements & Open Source Credits'}
        description={t.subtitle}
        canonical="/acknowledgements"
        structuredData={{
          breadcrumbs: [{ name: 'Acknowledgements', url: '/acknowledgements' }],
        }}
      />
      {/* Navbar */}
      <PrivacyNavbar />

      {/* Hero Section (Clean badge without number) */}
      <section className="pt-32 pb-8 px-6 lg:px-12 max-w-7xl mx-auto w-full text-center select-text">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/40 text-purple-300 text-xs font-bold uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Open Source Credits</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4">
          {t.title}
        </h1>

        <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          {t.subtitle}
        </p>
      </section>

      {/* Center Interactive Terminal */}
      <section className="w-full max-w-5xl mx-auto px-6 py-6 flex-1 flex flex-col select-text">
        {/* Dedicated Search & Category Filter Card (No clutter) */}
        <div className="mb-6 p-4 rounded-2xl bg-[#0e0a1f]/80 border border-purple-800/30 backdrop-blur-xl flex flex-col gap-3 shadow-xl">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = 0;
                }
              }}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#130d2a] border border-purple-800/40 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-purple-950/40 text-neutral-400 hover:text-white hover:bg-purple-900/30 border border-purple-800/30'
                }`}
              >
                {cat === 'All' ? t.all : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Retro-Modern Terminal Window (overflow-visible for popovers) */}
        <div className="relative rounded-3xl bg-[#0b0818]/90 border border-purple-800/40 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-visible flex-1 flex flex-col">
          {/* Terminal Title Bar & Integrated Speed/Pause Controller */}
          <div className="px-6 py-3 bg-[#120c27] border-b border-purple-800/30 rounded-t-3xl flex flex-wrap items-center justify-between gap-3 relative z-40">
            {/* Left: Window Dots & Script Info */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <span className="text-[11px] font-mono text-neutral-400 ml-2">
                eternal-credits.sh --total={filteredLibraries.length}
              </span>
            </div>

            {/* Right: Pause/Play + Telegram Speed Popover */}
            <div className="flex items-center gap-2 relative" ref={speedMenuRef}>
              {/* Terminal Status Label */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-purple-400 mr-1">
                <Terminal className="w-3 h-3" />
                <span>
                  {isHovered
                    ? 'PAUSED (HOVER)'
                    : isPaused
                      ? 'PAUSED'
                      : `AUTO (${speedMultiplier.toFixed(1)}x)`}
                </span>
              </div>

              {/* Pause / Play Button */}
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/70 border border-purple-800/40 text-xs font-bold text-purple-200 transition-all active:scale-95 shadow-sm"
                title={isPaused ? t.resume : t.pause}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Pause className="w-3.5 h-3.5 text-yellow-400" />
                )}
                <span>{isPaused ? t.resume : t.pause}</span>
              </button>

              {/* Telegram-Style Speed Trigger Button */}
              <button
                type="button"
                onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm ${
                  isSpeedMenuOpen
                    ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-purple-950/70 hover:bg-purple-900/70 border-purple-800/40 text-purple-200'
                }`}
                title="Change scrolling speed"
              >
                <Gauge className="w-3.5 h-3.5 text-purple-300" />
                <span>{speedMultiplier.toFixed(1)}x</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${isSpeedMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Telegram-Style Speed Dropdown Popover (Positioned above everything with z-[100]) */}
              {isSpeedMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#110b27] border border-purple-600/60 rounded-2xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-[100] flex flex-col gap-3 animate-fadeIn">
                  {/* Top Row: Multiplier and Range Slider */}
                  <div className="flex items-center gap-3 pb-3 border-b border-purple-800/40">
                    <span className="font-mono text-sm font-bold text-white min-w-[42px]">
                      {speedMultiplier.toFixed(1)}x
                    </span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speedMultiplier}
                      onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Presets List */}
                  <div className="flex flex-col gap-1">
                    {SPEED_PRESETS.map((preset) => {
                      const isSelected = Math.abs(speedMultiplier - preset.value) < 0.05;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setSpeedMultiplier(preset.value);
                            setIsSpeedMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                              : 'text-neutral-300 hover:bg-purple-900/30 hover:text-white'
                          }`}
                        >
                          <span className="font-mono">{preset.value.toFixed(1)}x</span>
                          <span className="text-neutral-400 font-medium">
                            {isUk ? preset.labelUk : preset.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrolling Viewport Container (Properly isolated with fade vignettes) */}
          <div
            className="relative overflow-hidden flex-1 rounded-b-3xl"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Top & Bottom Fade Vignettes */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0b0818] to-transparent z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0b0818] to-transparent z-20 pointer-events-none" />

            {/* Scrolling Library Grid */}
            <div
              ref={scrollContainerRef}
              onScroll={handleUserScroll}
              className="h-[480px] overflow-y-auto custom-scrollbar p-6 sm:p-8 relative z-10"
            >
              {filteredLibraries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                  <Search className="w-10 h-10 text-purple-500/40 mb-3" />
                  <p className="text-sm font-medium">{t.noResults}</p>
                </div>
              ) : (
                // When filtered, render 1 copy only (no duplicates).
                // When not filtered, render 2 copies for continuous seamless loop.
                (isFiltered ? [0] : [0, 1]).map((copyIndex) => (
                  <div key={copyIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {filteredLibraries.map((lib, idx) => (
                      <div
                        key={`${copyIndex}-${lib.name}-${idx}`}
                        onClick={() => handleLibraryClick(lib.githubUrl)}
                        className="p-4 rounded-2xl bg-[#140e2e]/60 hover:bg-[#201445] border border-purple-800/20 hover:border-purple-500/60 shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-200 cursor-pointer group flex items-start justify-between gap-3 transform hover:-translate-y-0.5"
                        title={`Open ${lib.name} on GitHub (Opens in new tab)`}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                              {lib.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-700/40 text-purple-300">
                              {lib.license}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 line-clamp-1 group-hover:text-neutral-300 transition-colors">
                            {lib.description}
                          </p>
                          <span className="text-[10px] text-purple-400/70 font-semibold tracking-wide">
                            {lib.category}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/30 text-purple-400 group-hover:text-white group-hover:bg-purple-600 transition-all shrink-0 mt-1">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Terminal Bottom Bar */}
            <div className="px-6 py-3 bg-[#120c27] border-t border-purple-800/30 flex items-center justify-between text-xs text-neutral-400 relative z-30">
              <span className="font-mono text-[11px]">
                Clicking opens official GitHub repository in a new tab.
              </span>
              <Link
                to="/licenses"
                className="text-purple-400 hover:text-purple-300 font-bold hover:underline transition-colors flex items-center gap-1"
              >
                <span>{t.viewLicenses}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default AcknowledgementsPage;
