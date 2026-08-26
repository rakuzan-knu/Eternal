import React, { useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Link } from 'react-router-dom';
import CodeBlock from './CodeBlock';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
  enableMentions?: boolean;
  enableHashtags?: boolean;
}

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

const TRAILING_PUNCT_SET = new Set(['.', ',', '!', '?', ':', ';', ')', ']']);

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

function preprocessDiscordMarkdown(raw: string): string {
  if (!raw) return '';

  // 1. Discord Subtext: lines starting with "-# "
  let processed = raw.replace(/(^|\n)-#\s+([^\n]+)/g, '$1\uE000SUBTEXT:$2\uE001');

  // 2. Escape double underscores in text segments outside of codeblocks
  // This prevents CommonMark from turning __ into <strong> and enables Discord-style __underline__
  const codeBlockRegex = /(```[\s\S]*?```|`[^`\n]+`)/g;
  const segments = processed.split(codeBlockRegex);
  processed = segments
    .map((segment) => {
      if (segment.startsWith('`')) {
        return segment;
      }
      let s = segment;
      // Normalization of compound Discord formats:
      // __***text***__ or ***__text__*** -> ***\_\_text\_\_*** (bold italic underline)
      s = s.replace(/__\*\*\*(.+?)\*\*\*__/gs, '***\\_\\_$1\\_\\_***');
      s = s.replace(/\*\*\*__(.+?)__\*\*\*/gs, '***\\_\\_$1\\_\\_***');
      // __**text**__ or **__text__** -> **\_\_text\_\_** (bold underline)
      s = s.replace(/__\*\*(.+?)\*\*__/gs, '**\\_\\_$1\\_\\_**');
      s = s.replace(/\*\*__(.+?)__\*\*/gs, '**\\_\\_$1\\_\\_**');
      // __*text*__ or *__text__* or ___text___ -> *\_\_text\_\_* (italic underline)
      s = s.replace(/__\*(.+?)\*__/gs, '*\\_\\_$1\\_\\_*');
      s = s.replace(/\*__(.+?)__\*/gs, '*\\_\\_$1\\_\\_*');
      s = s.replace(/___(.+?)___/gs, '*\\_\\_$1\\_\\_*');
      // Plain __underline__ -> \_\_underline\_\_
      s = s.replace(/__(.+?)__/gs, '\\_\\_$1\\_\\_');
      return s;
    })
    .join('');

  return processed;
}

function renderTextWithMentionsAndSpoilers(
  text: string,
  enableMentions = true,
  enableHashtags = true,
): React.ReactNode {
  if (!text) return null;

  // 1. Process Subtext: \uE000SUBTEXT:...\uE001
  if (text.includes('\uE000SUBTEXT:')) {
    const subtextParts = text.split(/(\uE000SUBTEXT:[\s\S]*?\uE001)/g);
    return subtextParts.map((part, index) => {
      if (part.startsWith('\uE000SUBTEXT:') && part.endsWith('\uE001')) {
        const subtextContent = part.slice('\uE000SUBTEXT:'.length, -1);
        return (
          <span key={index} className="block text-xs text-white/50 my-0.5 leading-snug font-normal">
            {renderTextWithMentionsAndSpoilers(subtextContent, enableMentions, enableHashtags)}
          </span>
        );
      }
      return (
        <React.Fragment key={index}>
          {renderTextWithMentionsAndSpoilers(part, enableMentions, enableHashtags)}
        </React.Fragment>
      );
    });
  }

  // 2. Process Spoilers: ||spoiler||
  if (text.includes('||')) {
    const spoilerParts = text.split(/(\|\|[\s\S]*?\|\|)/g);
    return spoilerParts.map((part, index) => {
      if (part.startsWith('||') && part.endsWith('||') && part.length >= 4) {
        const spoilerContent = part.slice(2, -2);
        return <TextSpoilerItem key={index} content={spoilerContent} />;
      }
      return (
        <React.Fragment key={index}>
          {renderTextWithMentionsAndSpoilers(part, enableMentions, enableHashtags)}
        </React.Fragment>
      );
    });
  }

  // 3. Process Underlines: __underline__
  if (text.includes('__')) {
    const underlineParts = text.split(/(__[\s\S]*?__)/g);
    return underlineParts.map((part, index) => {
      if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) {
        const underlineContent = part.slice(2, -2);
        return (
          <span key={index} className="underline underline-offset-2 decoration-white/70">
            {renderTextWithMentionsAndSpoilers(underlineContent, enableMentions, enableHashtags)}
          </span>
        );
      }
      return (
        <React.Fragment key={index}>
          {renderTextWithMentionsAndSpoilers(part, enableMentions, enableHashtags)}
        </React.Fragment>
      );
    });
  }

  // 4. Process Mentions (@handle) and Hashtags (#tag)
  if (!enableMentions && !enableHashtags) {
    return text;
  }

  const tokenRegex = /((?:@|#)[a-zA-Z0-9_\u0400-\u04FF]+(?:\.[a-zA-Z0-9_\u0400-\u04FF]+)*)/g;
  if (!tokenRegex.test(text)) {
    return text;
  }

  const parts = text.split(tokenRegex);
  return parts.map((part, index) => {
    if (enableMentions && part.startsWith('@')) {
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

    if (enableHashtags && part.startsWith('#')) {
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
  });
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel', 'className', 'href'],
    th: [...(defaultSchema.attributes?.th || []), 'className', 'align'],
    td: [...(defaultSchema.attributes?.td || []), 'className', 'align'],
  },
};

function processChildren(
  children: React.ReactNode,
  enableMentions: boolean,
  enableHashtags: boolean,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return renderTextWithMentionsAndSpoilers(child, enableMentions, enableHashtags);
    }
    return child;
  });
}

export default function MarkdownContent({
  content,
  className = '',
  enableMentions = true,
  enableHashtags = true,
}: MarkdownContentProps) {
  if (!content) return null;

  const processedContent = preprocessDiscordMarkdown(content);

  const components: Components = {
    // Custom pre renderer (unwraps to avoid double <pre> nesting)
    pre({ children }) {
      return <>{children}</>;
    },

    // Custom code renderer: distinguishes inline vs codeblock
    code({ className: codeClass, children, ...rest }) {
      const match = /language-([a-zA-Z0-9_-]+)/.exec(codeClass || '');
      const codeString = String(children || '').replace(/\n$/, '');

      // Check if block or multi-line
      const isBlock = match || codeString.includes('\n');

      if (isBlock) {
        const lang = match ? match[1] : '';
        return <CodeBlock language={lang} value={codeString} />;
      }

      // Inline code
      return (
        <code
          className="px-1.5 py-0.5 rounded-md bg-white/10 text-purple-300 font-mono text-[12px] border border-white/5 font-medium select-text break-all"
          {...rest}
        >
          {children}
        </code>
      );
    },

    // Text formatting
    strong({ children }) {
      return (
        <strong className="font-bold text-white">
          {processChildren(children, enableMentions, enableHashtags)}
        </strong>
      );
    },
    em({ children }) {
      return (
        <em className="italic text-white/90">
          {processChildren(children, enableMentions, enableHashtags)}
        </em>
      );
    },
    del({ children }) {
      return (
        <del className="line-through text-white/60">
          {processChildren(children, enableMentions, enableHashtags)}
        </del>
      );
    },

    // Blockquote
    blockquote({ children }) {
      return (
        <blockquote className="border-l-2 border-purple-500 pl-3 my-1.5 text-white/80 bg-white/[0.03] py-1 rounded-r-md italic">
          {processChildren(children, enableMentions, enableHashtags)}
        </blockquote>
      );
    },

    // Links
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors cursor-pointer"
        >
          {children}
        </a>
      );
    },

    // Headings
    h1({ children }) {
      return (
        <h1 className="text-lg font-bold text-white mt-3 mb-1.5 pb-1 border-b border-white/10">
          {processChildren(children, enableMentions, enableHashtags)}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-base font-bold text-white mt-2.5 mb-1 pb-0.5 border-b border-white/5">
          {processChildren(children, enableMentions, enableHashtags)}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-sm font-bold text-white mt-2 mb-0.5">
          {processChildren(children, enableMentions, enableHashtags)}
        </h3>
      );
    },

    // Lists
    ul({ children }) {
      return <ul className="list-disc list-inside my-1.5 space-y-0.5 pl-1">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-inside my-1.5 space-y-0.5 pl-1">{children}</ol>;
    },
    li({ children }) {
      return (
        <li className="leading-relaxed text-white/90">
          {processChildren(children, enableMentions, enableHashtags)}
        </li>
      );
    },

    // Paragraph
    p({ children }) {
      return (
        <p className="leading-relaxed my-1 break-words [overflow-wrap:anywhere] first:mt-0 last:mb-0">
          {processChildren(children, enableMentions, enableHashtags)}
        </p>
      );
    },

    // Tables
    table({ children }) {
      return (
        <div className="w-full my-2 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] custom-scrollbar">
          <table className="min-w-full divide-y divide-white/10 text-xs text-left">
            {children}
          </table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 bg-white/5 font-semibold text-white/90">
          {processChildren(children, enableMentions, enableHashtags)}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-3 py-1.5 border-t border-white/5 text-white/80">
          {processChildren(children, enableMentions, enableHashtags)}
        </td>
      );
    },

    // Horizontal Rule
    hr() {
      return <hr className="my-3 border-white/10" />;
    },
  };

  return (
    <div
      className={`markdown-content w-full min-w-0 max-w-full leading-relaxed select-text [overflow-wrap:anywhere] ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeKatex]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export { MarkdownContent, renderTextWithMentionsAndSpoilers };
