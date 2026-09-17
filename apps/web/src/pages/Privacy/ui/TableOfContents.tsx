import React from 'react';
import {
  ShieldCheck,
  Database,
  Cpu,
  Eye,
  Layers,
  Lock,
  KeyRound,
  HeartHandshake,
  FileText,
  Mail,
  Printer,
  ArrowUp,
  BookmarkCheck,
} from 'lucide-react';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { getLegalTranslation, PrivacySection } from '../data/privacyTranslations';

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Database: <Database className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
  Eye: <Eye className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  KeyRound: <KeyRound className="w-4 h-4" />,
  HeartHandshake: <HeartHandshake className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
};

interface TableOfContentsProps {
  sections: PrivacySection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  scrollProgress: number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  scrollProgress,
}) => {
  const { currentLanguage } = useLanguageStore();
  const t = getLegalTranslation(currentLanguage).toc;

  const handlePrint = () => {
    window.print();
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
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
                {t.contents}
              </span>
            </div>
            <span className="text-[11px] font-bold text-purple-300">
              {Math.min(100, Math.max(0, Math.round(scrollProgress)))}
              {t.readProgress}
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
                  onClick={() => onSelectSection(section.id)}
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

                  <span className="truncate leading-tight">
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
          <span>{t.print}</span>
        </button>

        <button
          type="button"
          onClick={handleScrollToTop}
          className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40 hover:border-purple-500/50 text-purple-200 transition-all active:scale-95 shrink-0"
          title={t.backToTop}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};
