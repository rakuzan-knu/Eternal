import React, { useEffect, useState } from 'react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { TLDRCallout } from '../Privacy/ui/TLDRCallout';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import {
  Crown,
  CreditCard,
  RefreshCw,
  HeartHandshake,
  Mail,
  Printer,
  ArrowUp,
  FileText,
} from 'lucide-react';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { PAID_SERVICES_DATA } from './data/paidServicesData';

const ICON_MAP: Record<string, React.ReactNode> = {
  Crown: <Crown className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  RefreshCw: <RefreshCw className="w-4 h-4" />,
  HeartHandshake: <HeartHandshake className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
};

export const PaidServicesPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? PAID_SERVICES_DATA.uk : PAID_SERVICES_DATA.en;
  const sections = data.sections;
  const tToc = data.toc;

  const [activeSectionId, setActiveSectionId] = useState<string>(
    sections[0]?.id || 'paid-services-overview',
  );
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Dynamic scroll tracker
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;

      if (scrollY + windowHeight >= scrollHeight - 40) {
        setScrollProgress(100);
        return;
      }

      const firstSec = document.getElementById(sections[0]?.id);
      const lastSec = document.getElementById(sections[sections.length - 1]?.id);

      if (firstSec && lastSec) {
        const firstTop = firstSec.getBoundingClientRect().top + scrollY - 140;
        const lastBottom = lastSec.getBoundingClientRect().bottom + scrollY;
        const totalArticleHeight = lastBottom - firstTop;

        if (scrollY <= firstTop) {
          setScrollProgress(0);
          return;
        }

        const readableRange = totalArticleHeight - windowHeight * 0.45;
        if (readableRange > 0) {
          const currentRead = scrollY - firstTop;
          const rawProgress = (currentRead / readableRange) * 100;
          setScrollProgress(Math.min(100, Math.max(0, rawProgress)));
          return;
        }
      }

      const totalHeight = scrollHeight - windowHeight;
      if (totalHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (scrollY / totalHeight) * 100)));
      }
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  // Section Observer
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);
      if (visibleEntries.length > 0) {
        const topEntry = visibleEntries.reduce((prev, curr) =>
          prev.boundingClientRect.top > curr.boundingClientRect.top ? prev : curr,
        );
        setActiveSectionId(topEntry.target.id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '-100px 0px -50% 0px',
      threshold: [0.1, 0.4],
    });

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-[#E0E0E6] font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between">
      <SEOHead
        title={data.hero.title || 'Paid Services & Refund Policy'}
        description={data.hero.description}
        canonical="/terms/paid-services"
        structuredData={{
          breadcrumbs: [
            { name: 'Terms of Service', url: '/terms' },
            { name: 'Paid Services', url: '/terms/paid-services' },
          ],
          faqs: sections.slice(0, 4).map((s) => ({
            question: s.title,
            answer: s.tldr || s.title,
          })),
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-32 pb-24 w-full flex-1">
        {/* Hero Section */}
        <div className="max-w-4xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-950/60 border border-pink-500/30 text-pink-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Crown className="w-3.5 h-3.5 text-pink-400" />
            {data.hero.archivedLink}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4">
            {data.hero.title}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-purple-300 mb-6 uppercase tracking-wider">
            {data.hero.effectiveDate}
          </p>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-3xl">
            {data.hero.description}
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative items-start">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28 z-20">
            <div className="p-6 rounded-3xl bg-[#0e0a1f]/80 border border-purple-800/30 backdrop-blur-xl shadow-2xl flex flex-col gap-6 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-purple-800/30 pb-4">
                <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                  {tToc.contents}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-150"
                      style={{ width: `${Math.round(scrollProgress)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-neutral-400 font-mono">
                    {Math.round(scrollProgress)}%
                  </span>
                </div>
              </div>

              {/* Navigation links */}
              <nav className="flex flex-col gap-1.5">
                {sections.map((sec) => {
                  const isActive = activeSectionId === sec.id;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-sm translate-x-1'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                            : 'bg-purple-950/60 text-purple-400 group-hover:bg-purple-900/50'
                        }`}
                      >
                        {ICON_MAP[sec.iconName] || <FileText className="w-3.5 h-3.5" />}
                      </div>
                      <span className="line-clamp-1 leading-snug">{sec.title}</span>
                    </a>
                  );
                })}
              </nav>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-purple-800/30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer border border-white/5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{tToc.print}</span>
                </button>
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="p-2 rounded-xl text-neutral-300 bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer border border-white/5"
                  title={tToc.backToTop}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </aside>

          {/* Content Column */}
          <div className="lg:col-span-8 flex flex-col gap-16 select-text">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 flex flex-col gap-6 group"
              >
                {/* Section Header */}
                <div className="border-b border-purple-900/30 pb-4">
                  <div className="flex items-center gap-2.5 text-xs font-black tracking-widest text-pink-400 uppercase mb-1">
                    <span className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-[10px]">
                      {section.number}
                    </span>
                    <span>SECTION {section.number}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {section.title}
                  </h2>
                </div>

                {/* TL;DR Callout */}
                {section.tldr && <TLDRCallout text={section.tldr} />}

                {/* Subsections */}
                <div className="flex flex-col gap-8">
                  {section.subsections.map((sub) => (
                    <div key={sub.id} className="flex flex-col gap-4">
                      <h3 className="text-lg sm:text-xl font-bold text-purple-200">{sub.title}</h3>
                      {sub.content.map((p, idx) => (
                        <p
                          key={idx}
                          className="text-sm sm:text-base text-neutral-300 leading-relaxed"
                        >
                          {p}
                        </p>
                      ))}
                      {sub.bullets && sub.bullets.length > 0 && (
                        <ul className="flex flex-col gap-2.5 pl-2">
                          {sub.bullets.map((b, bIdx) => (
                            <li
                              key={bIdx}
                              className="text-xs sm:text-sm text-neutral-300 leading-relaxed flex items-start gap-3"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(244,114,182,0.8)]" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default PaidServicesPage;
