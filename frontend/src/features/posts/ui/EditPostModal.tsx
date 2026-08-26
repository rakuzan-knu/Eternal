import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Eye } from 'lucide-react';
import { PostType } from '@/entities/post/model/types';
import Avatar from '@/shared/ui/Avatar';
import { AddEmojiButton } from '@/shared/ui/AddEmojiButton';
import { PostMedia } from '@/entities/post/ui/PostMedia';
import MarkdownContent from '@/shared/ui/MarkdownContent';
import SmartCodePasteBanner from '@/features/chat/ui/SmartCodePasteBanner';
import FloatingSelectionToolbar, {
  SelectionFormatType,
} from '@/features/chat/ui/FloatingSelectionToolbar';
import { detectCodeSnippet, DetectedCodeSnippet } from '@/features/chat/lib/smartCodeDetection';

interface EditPostModalProps {
  post: PostType;
  isOpen: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (newContent: string) => void;
}

const MAX_CHARS = 1000;

const WRAP_PAIRS: Record<string, [string, string]> = {
  '"': ['"', '"'],
  "'": ["'", "'"],
  '`': ['`', '`'],
  '(': ['(', ')'],
  '[': ['[', ']'],
  '{': ['{', '}'],
  '<': ['<', '>'],
};

export function EditPostModal({
  post,
  isOpen,
  isSaving = false,
  onClose,
  onSave,
}: EditPostModalProps) {
  const [content, setContent] = useState(post.text || '');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [detectedSnippet, setDetectedSnippet] = useState<DetectedCodeSnippet | null>(null);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(post.text || '');
      setIsEmojiOpen(false);
      setActiveTab('write');
      setDetectedSnippet(null);
      setFloatingToolbarPos(null);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSaving) {
          setIsEmojiOpen(false);
          onClose();
        }
      };

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, isSaving, onClose, post.text]);

  if (!isOpen) return null;

  const media =
    post.media && post.media.length > 0
      ? post.media
      : post.image
        ? [{ type: 'image' as const, url: post.image }]
        : [];
  const charCount = content.length;

  const handleSave = () => {
    if (isSaving) return;
    onSave(content.slice(0, MAX_CHARS));
  };

  const handleInsertEmoji = (emoji: string) => {
    if (content.length + emoji.length <= MAX_CHARS) {
      setContent((prev) => prev + emoji);
    }
  };

  const updateSelectionToolbar = () => {
    const el = textareaRef.current;
    if (!el) {
      setFloatingToolbarPos(null);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (
      start !== null &&
      end !== null &&
      start !== end &&
      el.value.slice(start, end).trim().length > 0
    ) {
      const rect = el.getBoundingClientRect();
      setFloatingToolbarPos({
        top: rect.top - 46,
        left: rect.left + rect.width / 2,
      });
    } else {
      setFloatingToolbarPos(null);
    }
  };

  const handleFormattingHotkey = (prefix: string, suffix: string, defaultPlaceholder = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = content.slice(start, end);
    const textToWrap = selected || defaultPlaceholder;
    const replacement = `${prefix}${textToWrap}${suffix}`;
    const nextText = (content.slice(0, start) + replacement + content.slice(end)).slice(
      0,
      MAX_CHARS,
    );

    setContent(nextText);

    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
      } else {
        el.setSelectionRange(
          start + prefix.length,
          start + prefix.length + defaultPlaceholder.length,
        );
      }
    });
  };

  const handleSelectionFormat = (type: SelectionFormatType, linkUrl?: string) => {
    switch (type) {
      case 'bold':
        handleFormattingHotkey('**', '**', 'bold');
        break;
      case 'italic':
        handleFormattingHotkey('*', '*', 'italic');
        break;
      case 'underline':
        handleFormattingHotkey('__', '__', 'underline');
        break;
      case 'strike':
        handleFormattingHotkey('~~', '~~', 'strikethrough');
        break;
      case 'spoiler':
        handleFormattingHotkey('||', '||', 'spoiler');
        break;
      case 'quote':
        handleFormattingHotkey('> ', '', 'quote');
        break;
      case 'code':
        handleFormattingHotkey('`', '`', 'code');
        break;
      case 'link':
        if (linkUrl) {
          handleFormattingHotkey('[', `](${linkUrl})`, 'link');
        }
        break;
    }
    setFloatingToolbarPos(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      const snippet = detectCodeSnippet(pastedText);
      if (snippet.isCode) {
        setDetectedSnippet(snippet);
      }
    }
  };

  const handleFormatSnippetAsMarkdown = () => {
    if (!detectedSnippet) return;
    const lang = detectedSnippet.language || '';
    const formatted = `\`\`\`${lang}\n${detectedSnippet.rawCode}\n\`\`\``;

    if (content.includes(detectedSnippet.rawCode)) {
      setContent((prev) => prev.replace(detectedSnippet.rawCode, formatted).slice(0, MAX_CHARS));
    } else {
      setContent((prev) => (prev ? `${prev}\n${formatted}` : formatted).slice(0, MAX_CHARS));
    }
    setDetectedSnippet(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;

    // Auto-Wrap Brackets & Quotes on selection
    if (
      el &&
      el.selectionStart !== null &&
      el.selectionEnd !== null &&
      el.selectionStart !== el.selectionEnd
    ) {
      const pair = WRAP_PAIRS[e.key];
      if (pair && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey(pair[0], pair[1]);
        return;
      }
    }

    const isCmdOrCtrl = e.ctrlKey || e.metaKey;

    if (isCmdOrCtrl) {
      const key = e.key.toLowerCase();
      if (key === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('**', '**', 'bold');
        return;
      }
      if (key === 'i' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('*', '*', 'italic');
        return;
      }
      if (key === 'u' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('__', '__', 'underline');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        handleFormattingHotkey('~~', '~~', 'strikethrough');
        return;
      }
      if ((e.shiftKey && key === 'c') || (e.altKey && key === 'c')) {
        e.preventDefault();
        handleFormattingHotkey('```\n', '\n```', 'code');
        return;
      }
      if (key === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const start = el?.selectionStart ?? 0;
        const end = el?.selectionEnd ?? 0;
        const selected = content.slice(start, end);
        if (selected.startsWith('http://') || selected.startsWith('https://')) {
          handleFormattingHotkey('[link](', ')', '');
        } else {
          handleFormattingHotkey('[', '](https://)', selected ? '' : 'text');
        }
        return;
      }
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
      onClick={() => {
        if (!isSaving) {
          setIsEmojiOpen(false);
          onClose();
        }
      }}
    >
      <div
        className="bg-[#1c1c20] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setIsEmojiOpen(false);
              onClose();
            }}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white">Edit information</h3>
            <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'write'
                    ? 'bg-purple-600/70 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Edit3 size={11} />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-purple-600/70 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye size={11} />
                <span>Preview</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="text-sm font-bold text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Done'}
          </button>
        </div>

        {detectedSnippet && activeTab === 'write' && (
          <div className="pt-2 px-4">
            <SmartCodePasteBanner
              snippet={detectedSnippet}
              onFormatMarkdown={handleFormatSnippetAsMarkdown}
              onAttachAsFile={() => {
                handleFormatSnippetAsMarkdown();
              }}
              onDismiss={() => setDetectedSnippet(null)}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Media preview column (if media present) */}
          {media.length > 0 && (
            <div className="md:w-1/2 bg-black/40 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto custom-scrollbar">
              <div className="w-full max-h-[50vh] rounded-2xl overflow-hidden shadow-lg">
                <PostMedia media={media} />
              </div>
            </div>
          )}

          {/* Text editor column */}
          <div
            className={`flex-1 flex flex-col p-5 ${media.length > 0 ? 'md:w-1/2' : 'w-full'} overflow-y-auto custom-scrollbar`}
          >
            {/* User info */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={post.avatar} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {typeof post.author === 'string'
                    ? post.author
                    : ((post.author as unknown as { displayName?: string })?.displayName ??
                      post.handle)}
                </p>
                <p className="text-xs text-gray-500 truncate">@{post.handle}</p>
              </div>
            </div>

            {/* Text input / Preview area */}
            <div className="flex-1 flex flex-col min-h-[160px]">
              {activeTab === 'write' ? (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onSelect={updateSelectionToolbar}
                  onKeyUp={updateSelectionToolbar}
                  onMouseUp={updateSelectionToolbar}
                  placeholder="Write a caption... (Markdown, LaTeX & Code supported)"
                  maxLength={MAX_CHARS}
                  rows={6}
                  className="w-full flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm focus:outline-none resize-none leading-relaxed"
                  autoFocus
                />
              ) : (
                <div className="flex-1 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-200 text-sm leading-relaxed overflow-y-auto custom-scrollbar">
                  {content.trim() ? (
                    <MarkdownContent content={content} />
                  ) : (
                    <p className="text-gray-500 italic text-sm">Nothing to preview.</p>
                  )}
                </div>
              )}

              {/* Bottom footer inside editor */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <AddEmojiButton
                    isOpen={isEmojiOpen}
                    onToggle={() => setIsEmojiOpen((prev) => !prev)}
                    onEmojiSelect={(emoji) => {
                      handleInsertEmoji(emoji);
                      setIsEmojiOpen(false);
                    }}
                    usePortal={true}
                  />
                </div>

                <span
                  className={`text-xs font-mono ${charCount >= MAX_CHARS ? 'text-rose-400 font-bold' : 'text-gray-500'}`}
                >
                  {charCount} / {MAX_CHARS}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {floatingToolbarPos && activeTab === 'write' && (
        <FloatingSelectionToolbar
          position={floatingToolbarPos}
          onFormat={handleSelectionFormat}
          onClose={() => setFloatingToolbarPos(null)}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export default EditPostModal;
