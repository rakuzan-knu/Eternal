import React from 'react';
import MarkdownContent from './MarkdownContent';

export interface FormattedTextProps {
  text: string;
  className?: string;
  enableMentions?: boolean;
  enableHashtags?: boolean;
}

export function FormattedText({
  text,
  className = '',
  enableMentions = true,
  enableHashtags = true,
}: FormattedTextProps) {
  if (!text) return null;

  return (
    <MarkdownContent
      content={text}
      className={className}
      enableMentions={enableMentions}
      enableHashtags={enableHashtags}
    />
  );
}

export default FormattedText;
