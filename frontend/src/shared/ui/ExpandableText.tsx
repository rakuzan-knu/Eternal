import React, { useState } from 'react';

const CHAR_LIMIT = 280;

export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > CHAR_LIMIT;
  const shown = expanded || !isLong ? text : `${text.slice(0, CHAR_LIMIT).trimEnd()}…`;

  return (
    <p className="text-gray-200 text-[15px] leading-relaxed mt-1 whitespace-pre-line">
      {shown}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-blue-400 hover:text-blue-300 font-medium ml-1 cursor-pointer"
        >
          {expanded ? 'Hide' : 'Morе'}
        </button>
      )}
    </p>
  );
}
