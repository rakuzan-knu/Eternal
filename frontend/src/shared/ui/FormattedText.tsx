import React from 'react';
import { Link } from 'react-router-dom';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';

interface FormattedTextProps {
  text: string;
  className?: string;
}

const TRAILING_PUNCT_SET = new Set(['.', ',', '!', '?', ':', ';']);

function splitTrailingPunct(raw: string): { clean: string; punct: string } {
  let end = raw.length - 1;
  while (end >= 0 && TRAILING_PUNCT_SET.has(raw[end])) {
    end--;
  }
  return {
    clean: raw.slice(0, end + 1),
    punct: raw.slice(end + 1),
  };
}

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  if (!text) return null;

  const tokenRegex = /((?:@|#)[a-zA-Z0-9_\u0400-\u04FF]+(?:\.[a-zA-Z0-9_\u0400-\u04FF]+)*)/g;
  const parts = text.split(tokenRegex);

  return (
    <span className={`whitespace-pre-line break-words ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const rawHandle = part.slice(1);
          const { clean: cleanHandle, punct: trailingPunct } = splitTrailingPunct(rawHandle);

          if (!cleanHandle) {
            return <React.Fragment key={index}>{part}</React.Fragment>;
          }

          return (
            <React.Fragment key={index}>
              <MiniProfileHoverCard username={cleanHandle}>
                <Link
                  to={`/profile/${cleanHandle}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sky-400 font-semibold hover:underline hover:text-sky-300 transition-colors"
                >
                  @{cleanHandle}
                </Link>
              </MiniProfileHoverCard>
              {trailingPunct}
            </React.Fragment>
          );
        }

        if (part.startsWith('#')) {
          const rawTag = part.slice(1);
          const { clean: cleanTag, punct: trailingPunct } = splitTrailingPunct(rawTag);

          if (!cleanTag) {
            return <React.Fragment key={index}>{part}</React.Fragment>;
          }

          return (
            <React.Fragment key={index}>
              <Link
                to={`/search?q=${encodeURIComponent('#' + cleanTag)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sky-400 font-semibold hover:underline hover:text-sky-300 transition-colors"
              >
                #{cleanTag}
              </Link>
              {trailingPunct}
            </React.Fragment>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
