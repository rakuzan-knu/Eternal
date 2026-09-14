import React, { useEffect, useState } from 'react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { TLDRCallout } from '../Privacy/ui/TLDRCallout';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import {
  ShieldCheck,
  Database,
  Cpu,
  Eye,
  KeyRound,
  FileText,
  Mail,
  BookmarkCheck,
  Printer,
  ArrowUp,
} from 'lucide-react';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { getTermsTranslation } from './data/termsTranslations';

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Database: <Database className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
  Eye: <Eye className="w-4 h-4" />,
  KeyRound: <KeyRound className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
};

export const TermsPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const termsData = getTermsTranslation(currentLanguage);
  const sections = termsData.sections;
  const tToc = termsData.toc;

  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || 'who-we-are');
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Dynamic content-aware scroll tracker & IntersectionObserver
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;

      // 1. Bottom of page
      if (scrollY + windowHeight >= scrollHeight - 40) {
        setScrollProgress(100);
        return;
      }

      // 2. Measure against the main terms article content
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

      // Fallback
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
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial calculation
    handleScroll();

    // IntersectionObserver for active section highlight
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr,
          );
          if (topEntry.target.id) {
            setActiveSectionId(topEntry.target.id);
          }
        }
      },
      {
        rootMargin: '-100px 0px -55% 0px',
        threshold: [0, 0.2, 0.5],
      },
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, [sections]);

  // Smooth scroll to target section
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const navOffset = 100;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSectionId(id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-[#E0E0E6] font-sans antialiased selection:bg-purple-600 selection:text-white">
      <SEOHead
        title="Terms of Service • User Agreement & Community Standards"
        description={termsData.hero.description}
        canonical="/terms"
        structuredData={{
          breadcrumbs: [{ name: 'Terms of Service', url: '/terms' }],
          faqs: sections.slice(0, 5).map((s) => ({
            question: s.title,
            answer: s.tldr || s.subsections?.[0]?.content?.[0] || s.title,
          })),
        }}
      />
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            margin: 1.5cm 1.5cm;
            size: portrait;
          }
          *, *::before, *::after {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body, #root, .min-h-screen {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          }
          header, nav, .privacy-navbar, .table-of-contents, aside, footer, #eternal-footer, button, .print-hide, .lucide {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .grid {
            display: block !important;
          }
          article, .terms-content {
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          section {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            border-bottom: 1px solid #d1d5db !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 16pt 0 !important;
            margin: 0 0 16pt 0 !important;
            color: #000000 !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          h1, h2, h3, h4, p, span, li, a {
            color: #000000 !important;
          }
          h1 {
            font-size: 22pt !important;
            font-weight: 800 !important;
            margin-bottom: 6pt !important;
            line-height: 1.2 !important;
            color: #000000 !important;
          }
          h2 {
            font-size: 15pt !important;
            font-weight: 700 !important;
            margin-top: 10pt !important;
            margin-bottom: 6pt !important;
            color: #000000 !important;
            break-after: avoid;
            page-break-after: avoid;
          }
          h3 {
            font-size: 12pt !important;
            font-weight: 600 !important;
            margin-top: 8pt !important;
            margin-bottom: 4pt !important;
            color: #111827 !important;
            break-after: avoid;
            page-break-after: avoid;
          }
          p, li {
            font-size: 10pt !important;
            line-height: 1.55 !important;
            color: #1f2937 !important;
          }
          .rounded-3xl, .rounded-2xl, [class*="rounded-"] {
            border-radius: 0 !important;
          }
          [class*="bg-"], .bg-transparent {
            background: transparent !important;
            background-color: transparent !important;
            border: 1px solid #e5e7eb !important;
          }
          ul {
            list-style-type: disc !important;
            padding-left: 18pt !important;
          }
          a {
            text-decoration: underline !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Top Navigation */}
      <PrivacyNavbar />

      {/* Hero Header Area */}
      <section className="pt-32 pb-12 px-6 lg:px-12 max-w-7xl mx-auto border-b border-purple-900/20">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4">
            {termsData.hero.title}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-neutral-400 mb-6">
            {termsData.hero.effectiveDate}
          </p>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
            {termsData.hero.description}
          </p>
        </div>
      </section>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Sticky Left Sidebar: Table of Contents */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28">
            <nav
              aria-label="Table of Contents"
              className="table-of-contents sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar p-5 rounded-2xl bg-[#0e0a1f]/70 border border-purple-800/30 backdrop-blur-xl shadow-2xl flex flex-col justify-between select-none"
            >
              <div>
                {/* Header & Progress */}
                <div className="pb-4 mb-4 border-b border-purple-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookmarkCheck className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        {tToc.contents}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-300">
                      {Math.min(100, Math.max(0, Math.round(scrollProgress)))}
                      {tToc.readProgress}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, scrollProgress))}%` }}
                    />
                  </div>
                </div>

                {/* Section Links */}
                <ul className="flex flex-col gap-1.5">
                  {sections.map((section) => {
                    const isActive = activeSectionId === section.id;
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-2.5 group ${
                            isActive
                              ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white font-bold border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.25)] translate-x-1'
                              : 'text-neutral-400 hover:text-neutral-200 hover:bg-purple-900/20 hover:translate-x-0.5'
                          }`}
                        >
                          <div
                            className={`p-1 rounded-lg shrink-0 transition-colors ${
                              isActive
                                ? 'bg-purple-500 text-white shadow-sm'
                                : 'bg-neutral-800/80 text-neutral-400 group-hover:text-purple-300'
                            }`}
                          >
                            {ICON_MAP[section.iconName] || <ShieldCheck className="w-3.5 h-3.5" />}
                          </div>

                          <span className="truncate leading-snug">
                            {section.number}. {section.title}
                          </span>

                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Quick Action Tools */}
              <div className="pt-4 mt-4 border-t border-purple-800/30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40 hover:border-purple-500/50 text-[11px] font-semibold text-purple-200 transition-all active:scale-95"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" />
                  <span>{tToc.print}</span>
                </button>

                <button
                  type="button"
                  onClick={handleScrollToTop}
                  className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40 hover:border-purple-500/50 text-purple-200 transition-all active:scale-95 shrink-0"
                  title={tToc.backToTop}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Terms of Service Article */}
          <main className="lg:col-span-8 flex flex-col gap-12 terms-content">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 p-6 sm:p-10 rounded-3xl bg-[#0e0a1f]/40 border border-purple-800/20 backdrop-blur-sm shadow-xl flex flex-col gap-6"
              >
                {/* Section Header */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-800/40 text-purple-400 shrink-0">
                    {ICON_MAP[section.iconName] || <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-widest text-purple-400 uppercase">
                      Section {section.number}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                      {section.title}
                    </h2>
                  </div>
                </div>

                {/* Plain-English Callout Card */}
                {section.tldr && <TLDRCallout text={section.tldr} />}

                {/* Subsections Content */}
                <div className="flex flex-col gap-8 text-neutral-300 leading-relaxed text-sm sm:text-base">
                  {section.subsections.map((sub) => (
                    <div key={sub.id} className="flex flex-col gap-3">
                      <h3 className="text-lg font-bold text-white tracking-tight">{sub.title}</h3>
                      {sub.content.map((paragraph, idx) => (
                        <p key={idx} className="text-neutral-300">
                          {paragraph}
                        </p>
                      ))}

                      {/* Bulleted list if available */}
                      {sub.bullets && sub.bullets.length > 0 && (
                        <ul className="list-disc list-inside flex flex-col gap-2 pl-2 text-neutral-300/90 mt-1">
                          {sub.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>

      {/* Universal Footer Component with Dynamic Translation */}
      <EternalFooter />
    </div>
  );
};

export default TermsPage;
