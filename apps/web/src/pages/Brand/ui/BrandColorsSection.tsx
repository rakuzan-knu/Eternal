import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { ColorSwatch } from '../data/brandingData';

export const BrandColorsSection: React.FC<{
  heading: string;
  subtitle: string;
  swatches: ColorSwatch[];
  copiedText: string;
}> = ({ heading, subtitle, swatches, copiedText }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (swatch: ColorSwatch) => {
    navigator.clipboard.writeText(swatch.hex);
    setCopiedId(swatch.id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === swatch.id ? null : curr));
    }, 2000);
  };

  return (
    <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      {/* Section Header */}
      <div className="text-left mb-10">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-3">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 font-medium max-w-3xl">{subtitle}</p>
      </div>

      {/* Color Swatch Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {swatches.map((swatch) => {
          const isCopied = copiedId === swatch.id;

          return (
            <div
              key={swatch.id}
              onClick={() => handleCopy(swatch)}
              className={`p-6 sm:p-7 rounded-[32px] ${swatch.bgClass} ${
                swatch.borderClass || 'border border-white/[0.08]'
              } shadow-2xl flex flex-col justify-between h-64 cursor-pointer group transition-all duration-300 hover:scale-[1.03] active:scale-95 relative overflow-hidden`}
            >
              {/* Top Text Info */}
              <div className="flex flex-col gap-1 z-10">
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${swatch.textClass}`}>
                  {swatch.name}
                </h3>
                <span className={`text-xs font-mono opacity-80 ${swatch.textClass}`}>
                  {swatch.hex}
                </span>
                <span className={`text-[11px] font-mono opacity-60 ${swatch.textClass}`}>
                  {swatch.rgb}
                </span>
              </div>

              {/* Bottom Copy Action Pill */}
              <div className="flex items-center justify-between z-10 pt-4">
                <span className={`text-[11px] font-medium opacity-70 ${swatch.textClass}`}>
                  {swatch.description}
                </span>

                <div
                  className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                    isCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-black/30 group-hover:bg-black/50 text-white'
                  }`}
                  title="Click to copy HEX"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </div>
              </div>

              {/* Floating Copy Feedback Banner */}
              {isCopied && (
                <div className="absolute inset-x-0 bottom-0 py-1 bg-green-500 text-white text-[11px] font-bold text-center animate-fadeIn">
                  {copiedText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
