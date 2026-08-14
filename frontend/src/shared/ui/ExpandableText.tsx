import React, { useState } from 'react';
import { FormattedText } from './FormattedText';

const CHAR_LIMIT = 280;

export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > CHAR_LIMIT;
  const shown = expanded || !isLong ? text : `${text.slice(0, CHAR_LIMIT).trimEnd()}…`;

  return (
    <div className="text-gray-200 text-[15px] leading-relaxed mt-1">
      <FormattedText text={shown} />
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sky-400 hover:text-sky-300 font-medium ml-1 cursor-pointer"
        >
          {expanded ? 'Hide' : 'More'}
        </button>
      )}
    </div>
  );
}
