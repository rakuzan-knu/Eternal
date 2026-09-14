import React from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { getLegalTranslation } from '../data/privacyTranslations';

interface TLDRCalloutProps {
  text: string;
}

export const TLDRCallout: React.FC<TLDRCalloutProps> = ({ text }) => {
  const { currentLanguage } = useLanguageStore();
  const t = getLegalTranslation(currentLanguage).callout;

  return (
    <div className="tldr-callout my-5 p-5 rounded-2xl bg-[#130d29]/80 border border-purple-500/25 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden transition-all hover:border-purple-500/40">
      {/* Subtle purple left accent line */}
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 rounded-l-2xl" />

      <div className="flex flex-col gap-2 pl-1">
        <div className="flex items-center gap-2 text-purple-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">{t.briefly}</span>
        </div>
        <p className="text-sm font-medium text-neutral-200 leading-relaxed">{text}</p>
      </div>
    </div>
  );
};
