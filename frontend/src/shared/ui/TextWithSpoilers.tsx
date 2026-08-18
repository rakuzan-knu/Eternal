import React, { useState } from 'react';

function TextSpoilerItem({ content }: { content: string }) {
  const [isRevealed, setIsRevealed] = useState(false);

  if (isRevealed) {
    return (
      <span className="inline-block align-baseline rounded px-1.5 py-0.5 mx-0.5 bg-white/10 border border-white/15 text-white animate-fadeIn cursor-text transition-all">
        {content}
      </span>
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setIsRevealed(true);
      }}
      title="Click to reveal spoiler"
      className="group/spoiler inline-block align-baseline rounded px-1.5 py-0.5 mx-0.5 bg-white/15 hover:bg-white/25 border border-white/10 cursor-pointer select-none transition-all shadow-sm"
    >
      <span className="filter blur-[5px] opacity-40 group-hover/spoiler:opacity-60 transition-opacity">
        {content}
      </span>
    </span>
  );
}

export default function TextWithSpoilers({ text }: { text: string }) {
  if (!text) return null;
  if (!text.includes('||')) {
    return <span>{text}</span>;
  }

  const parts = text.split(/(\|\|[\s\S]*?\|\|)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('||') && part.endsWith('||') && part.length >= 4) {
          const spoilerContent = part.slice(2, -2);
          return <TextSpoilerItem key={index} content={spoilerContent} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
