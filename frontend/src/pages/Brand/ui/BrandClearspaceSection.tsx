import React from 'react';

export const BrandClearspaceSection: React.FC<{
  heading: string;
  subtitle: string;
  label1: string;
  label2: string;
}> = ({ heading, subtitle, label1, label2 }) => {
  return (
    <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      {/* Section Header */}
      <div className="text-left mb-10">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-3">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 font-medium max-w-3xl">{subtitle}</p>
      </div>

      {/* Clearspace Visual Blueprint Container */}
      <div className="rounded-[40px] bg-[#120f24] border border-white/[0.08] p-8 sm:p-14 shadow-2xl flex flex-col lg:flex-row items-center justify-around gap-12 overflow-hidden relative">
        {/* Ambient Grid Lines Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* 1. Full Logo Clearspace Blueprint (Left) */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative p-8 rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-950/20 flex items-center justify-center">
            {/* Corner Clearspace Guides "E" */}
            <div className="absolute -top-3.5 left-4 px-1.5 bg-[#120f24] text-[11px] font-mono text-purple-400 font-bold">
              1/2 E
            </div>
            <div className="absolute -bottom-3.5 right-4 px-1.5 bg-[#120f24] text-[11px] font-mono text-purple-400 font-bold">
              1/2 E
            </div>
            <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 px-1 bg-[#120f24] text-[11px] font-mono text-purple-400 font-bold">
              E
            </div>
            <div className="absolute top-1/2 -right-3.5 -translate-y-1/2 px-1 bg-[#120f24] text-[11px] font-mono text-purple-400 font-bold">
              E
            </div>

            {/* Inner Logo */}
            <div className="flex items-center gap-3 select-none px-6 py-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-md">
                E
              </div>
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Eternal
              </span>
            </div>
          </div>

          <span className="text-xs text-neutral-400 font-mono text-center">{label1}</span>
        </div>

        {/* 2. Standalone Symbol 1/3x Margin Blueprint (Right) */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative p-8 rounded-2xl border-2 border-dashed border-indigo-500/40 bg-indigo-950/20 flex items-center justify-center">
            {/* Dimension indicators */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 bg-[#120f24] text-[11px] font-mono text-indigo-400 font-bold">
              1/3 x
            </div>
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 px-1 bg-[#120f24] text-[11px] font-mono text-indigo-400 font-bold">
              x
            </div>

            {/* Symbol */}
            <div className="w-20 h-20 rounded-2xl bg-[#07050f] border border-white/10 flex items-center justify-center text-4xl font-black text-white shadow-lg">
              E
            </div>
          </div>

          <span className="text-xs text-neutral-400 font-mono text-center">{label2}</span>
        </div>
      </div>
    </section>
  );
};
