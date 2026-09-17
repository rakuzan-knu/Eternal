import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';

export const BrandLegalSection: React.FC<{
  heading: string;
  intro: string;
  dosTitle: string;
  dosItems: string[];
  dontsTitle: string;
  dontsItems: string[];
  termsLinkText: string;
  guidelinesLinkText: string;
}> = ({
  heading,
  intro,
  dosTitle,
  dosItems,
  dontsTitle,
  dontsItems,
  termsLinkText,
  guidelinesLinkText,
}) => {
  const [openAccordion, setOpenAccordion] = useState<'dos' | 'donts' | null>('dos');

  const toggleAccordion = (type: 'dos' | 'donts') => {
    setOpenAccordion((curr) => (curr === type ? null : type));
  };

  return (
    <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Heading & Legal Description */}
        <div className="lg:col-span-5 flex flex-col gap-6 text-left">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight">
            {heading}
          </h2>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
            {intro}
          </p>
        </div>

        {/* Right Column: Do's and Don'ts Accordion */}
        <div className="lg:col-span-7 flex flex-col divide-y divide-white/[0.1] border-y border-white/[0.1]">
          {/* 1. Do's Accordion Item */}
          <div className="py-6 flex flex-col">
            <button
              type="button"
              onClick={() => toggleAccordion('dos')}
              className="flex items-center justify-between w-full text-left cursor-pointer group"
            >
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-300 transition-colors">
                {dosTitle}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/[0.06] group-hover:bg-purple-600/30 border border-white/10 flex items-center justify-center text-white transition-all">
                {openAccordion === 'dos' ? <Minus size={16} /> : <Plus size={16} />}
              </div>
            </button>

            {openAccordion === 'dos' && (
              <div className="mt-5 flex flex-col gap-4 animate-fadeIn">
                <ul className="flex flex-col gap-3.5">
                  {dosItems.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm sm:text-base text-neutral-300 leading-relaxed font-normal"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-2.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 2. Don'ts Accordion Item */}
          <div className="py-6 flex flex-col">
            <button
              type="button"
              onClick={() => toggleAccordion('donts')}
              className="flex items-center justify-between w-full text-left cursor-pointer group"
            >
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-300 transition-colors">
                {dontsTitle}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/[0.06] group-hover:bg-purple-600/30 border border-white/10 flex items-center justify-center text-white transition-all">
                {openAccordion === 'donts' ? <Minus size={16} /> : <Plus size={16} />}
              </div>
            </button>

            {openAccordion === 'donts' && (
              <div className="mt-5 flex flex-col gap-4 animate-fadeIn">
                <ul className="flex flex-col gap-3.5">
                  {dontsItems.map((item, index) => {
                    // Check if this item is the Terms of Service & Community Guidelines bullet
                    if (index === 4) {
                      return (
                        <li
                          key={index}
                          className="flex items-start gap-3 text-sm sm:text-base text-neutral-300 leading-relaxed font-normal"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-2.5" />
                          <span>
                            {item}{' '}
                            <Link
                              to="/terms"
                              className="text-purple-300 font-bold underline underline-offset-4 hover:text-white transition-colors"
                            >
                              {termsLinkText}
                            </Link>{' '}
                            or{' '}
                            <Link
                              to="/guidelines"
                              className="text-purple-300 font-bold underline underline-offset-4 hover:text-white transition-colors"
                            >
                              {guidelinesLinkText}
                            </Link>
                            .
                          </span>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm sm:text-base text-neutral-300 leading-relaxed font-normal"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-2.5" />
                        <span>{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
