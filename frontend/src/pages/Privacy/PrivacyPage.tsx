import React, { useEffect, useState } from 'react';
import { PrivacyNavbar } from './ui/PrivacyNavbar';
import { TableOfContents } from './ui/TableOfContents';
import { TLDRCallout } from './ui/TLDRCallout';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { ShieldCheck, Database, Cpu, Eye, KeyRound, Mail } from 'lucide-react';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { getLegalTranslation } from './data/privacyTranslations';

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-purple-400" />,
  Database: <Database className="w-5 h-5 text-purple-400" />,
  Cpu: <Cpu className="w-5 h-5 text-purple-400" />,
  Eye: <Eye className="w-5 h-5 text-purple-400" />,
  KeyRound: <KeyRound className="w-5 h-5 text-purple-400" />,
  Mail: <Mail className="w-5 h-5 text-purple-400" />,
};

export const PrivacyPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const legalData = getLegalTranslation(currentLanguage);
  const sections = legalData.sections;

  const [activeSectionId, setActiveSectionId] = useState<string>(
    sections[0]?.id || 'welcome-and-basics',
  );
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Scroll spy & smooth reading progress tracker
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;

      // 1. If at or near the very bottom of the page
      if (scrollY + windowHeight >= scrollHeight - 40) {
        setScrollProgress(100);
        return;
      }

      // 2. Measure against the actual privacy article content
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

        // 100% reached when last section is in the upper reading viewport or reached
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

    // IntersectionObserver for active TOC highlight
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

  return (
    <div className="min-h-screen bg-[#07050f] text-[#E0E0E6] font-sans antialiased selection:bg-purple-600 selection:text-white">
      <SEOHead
        title={legalData.hero.title || 'Privacy Policy'}
        description={legalData.hero.description}
        canonical="/privacy"
        structuredData={{
          breadcrumbs: [{ name: 'Privacy Policy', url: '/privacy' }],
          faqs: sections.slice(0, 5).map((s) => ({
            question: s.title,
            answer: s.tldr || s.subsections?.[0]?.content?.[0] || s.title,
          })),
        }}
      />
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .privacy-navbar,
          .table-of-contents,
          footer {
            display: none !important;
          }
          .privacy-content {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Top Navigation */}
      <PrivacyNavbar />

      {/* Hero Header Area */}
      <section className="pt-32 pb-12 px-6 lg:px-12 max-w-7xl mx-auto border-b border-purple-900/20">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4">
            {legalData.hero.title}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-neutral-400 mb-6">
            {legalData.hero.effectiveDate}
          </p>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
            {legalData.hero.description}
          </p>
        </div>
      </section>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Sticky Left Sidebar: Table of Contents */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28">
            <TableOfContents
              sections={sections}
              activeSectionId={activeSectionId}
              onSelectSection={scrollToSection}
              scrollProgress={scrollProgress}
            />
          </aside>

          {/* Main Privacy Policy Article */}
          <main className="lg:col-span-8 flex flex-col gap-12 privacy-content">
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

export default PrivacyPage;
