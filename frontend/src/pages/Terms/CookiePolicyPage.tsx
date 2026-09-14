import React, { useEffect, useState } from 'react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { TLDRCallout } from '../Privacy/ui/TLDRCallout';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { Cookie, Settings, Mail, Printer, ArrowUp, FileText } from 'lucide-react';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { COOKIE_POLICY_DATA } from './data/cookiePolicyData';

const ICON_MAP: Record<string, React.ReactNode> = {
  Cookie: <Cookie className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
};

export const CookiePolicyPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const isUkrainian = currentLanguage === 'Українська';
  const data = isUkrainian ? COOKIE_POLICY_DATA.uk : COOKIE_POLICY_DATA.en;
  const sections = data.sections;
  const tToc = data.toc;

  const [activeSectionId, setActiveSectionId] = useState<string>(
    sections[0]?.id || 'types-of-cookies',
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
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      },
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSectionId(id);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <SEOHead
        title="Cookie Policy • How Eternal Uses Cookies & Telemetry"
        description={data.hero.description}
        canonical="/terms/cookie-policy"
        structuredData={{
          breadcrumbs: [
            { name: 'Terms of Service', url: '/terms' },
            { name: 'Cookie Policy', url: '/terms/cookie-policy' },
          ],
          faqs: sections.slice(0, 4).map((s) => ({
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
          header, nav, .privacy-navbar, aside, footer, #eternal-footer, button, .print-hide, .lucide {
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
          article {
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

      {/* Top Navbar */}
      <PrivacyNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-12 pt-32 pb-24 w-full">
        {/* ========================================================================= */}
        {/* HERO SECTION                                                             */}
        {/* ========================================================================= */}
        <section className="mb-14 border-b border-purple-900/30 pb-10">
          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold text-purple-400 uppercase tracking-widest flex items-center gap-2 print-hide">
              <span>{data.hero.archivedLink}</span>
            </span>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-tight drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
              {data.hero.title}
            </h1>

            <p className="text-sm text-purple-300/80 font-medium">{data.hero.effectiveDate}</p>

            <p className="mt-4 text-base sm:text-lg text-neutral-300 leading-relaxed max-w-3xl">
              {data.hero.description}
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MAIN BODY: STICKY TOC SIDEBAR + POLICY CONTENT                          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative items-start">
          {/* Left Sticky TOC Sidebar */}
          <aside className="lg:col-span-4 hidden lg:block sticky top-28 select-none">
            <div className="p-6 rounded-3xl bg-[#110e20] border border-purple-900/30 backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-6">
              {/* Progress Indicator */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-purple-300">
                  <span>{tToc.contents}</span>
                  <span>
                    {Math.round(scrollProgress)}
                    {tToc.readProgress}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-150"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1.5">
                {sections.map((section) => {
                  const isActive = activeSectionId === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      type="button"
                      className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                        isActive
                          ? 'bg-purple-600/30 text-white font-bold border-l-4 border-purple-500 shadow-sm'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isActive
                            ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                            : 'bg-white/10 text-neutral-300'
                        }`}
                      >
                        {section.number}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Utility Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                  title="Print this document"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{tToc.print}</span>
                </button>

                <button
                  type="button"
                  onClick={scrollToTop}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>{tToc.backToTop}</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Right Main Article Content */}
          <article className="lg:col-span-8 flex flex-col gap-16">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-32 p-8 sm:p-10 rounded-[32px] bg-[#110e20] border border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.3)] transition-all"
              >
                {/* Section Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    {ICON_MAP[section.iconName] || <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest block">
                      Section {section.number}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                      {section.title}
                    </h2>
                  </div>
                </div>

                {/* TLDR Callout */}
                {section.tldr && (
                  <div className="mb-8">
                    <TLDRCallout text={section.tldr} />
                  </div>
                )}

                {/* Subsections */}
                <div className="space-y-8">
                  {section.subsections.map((sub) => (
                    <div key={sub.id} className="space-y-4">
                      {sub.title && (
                        <h3 className="text-lg font-bold text-purple-200">{sub.title}</h3>
                      )}
                      {sub.content.map((paragraph, pIdx) => (
                        <p key={pIdx} className="text-neutral-300 leading-relaxed text-base">
                          {paragraph}
                        </p>
                      ))}
                      {sub.bullets && sub.bullets.length > 0 && (
                        <ul className="space-y-2.5 pt-1 pl-2">
                          {sub.bullets.map((bullet, bIdx) => (
                            <li
                              key={bIdx}
                              className="flex items-start gap-3 text-neutral-300 text-base leading-relaxed"
                            >
                              <span className="text-purple-400 font-bold mt-1 shrink-0">✦</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default CookiePolicyPage;
