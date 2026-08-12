import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, Mic, FileImage as FileIcon } from 'lucide-react';
import { MessageView } from '../../../entities/chat/model/types';
import { useMessageActions } from '../model/useMessageActions';
import { OutgoingAttachment } from '../../../entities/chat/model/types';
import { StagedFile } from '@/shared/model/useStagedAttachments';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/shared/lib/attachmentLimits';
import ReplyPreview from './ReplyPreview';
import { AddEmojiButton } from '@/shared/ui/AddEmojiButton';
import { AddGifButton } from '@/shared/ui/AddGifButton';
import PollComposer from './PollComposer';
import AttachMenu from '@/shared/ui/AttachMenu';
import ImageEditorModal from '@/shared/ui/ImageEditorModal';

interface MessageComposerProps {
  actions: ReturnType<typeof useMessageActions>;
  replyingTo: MessageView | null;
  onCancelReply: () => void;
  stagedFiles: StagedFile[];
  stagedFilesError: string | null;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onReplaceFile: (index: number, file: File) => void;
  onClearFiles: () => void;
  onDismissFilesError: () => void;
  isGroup: boolean;
}

type OpenPopover = 'emoji' | 'gif' | 'poll' | null;

const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 160;

export default function MessageComposer({
  actions,
  replyingTo,
  onCancelReply,
  stagedFiles,
  stagedFilesError,
  onAddFiles,
  onRemoveFile,
  onReplaceFile,
  onClearFiles,
  onDismissFilesError,
  isGroup,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [isSending, setIsSending] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;
  }, [text]);

  useEffect(() => {
    if (!stagedFilesError) return;
    const id = setTimeout(onDismissFilesError, 4000);
    return () => clearTimeout(id);
  }, [stagedFilesError, onDismissFilesError]);

  const togglePopover = (key: Exclude<OpenPopover, null>) =>
    setOpenPopover((prev) => (prev === key ? null : key));

  const handleTextChange = (value: string) => {
    setText(value);
    actions.setTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => actions.setTyping(false), 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      handleTextChange(text + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    handleTextChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleGifSelect = (gifUrl: string) => {
    setOpenPopover(null);
    actions
      .sendMessage('', replyingTo?.id, [{ type: 'GIF', url: gifUrl, mimeType: 'image/gif' }])
      .catch(() => {});
    onCancelReply();
  };

  const handleSend = async () => {
    if (isSending) return;
    if (!text.trim() && stagedFiles.length === 0) return;

    setIsSending(true);
    try {
      let attachments: OutgoingAttachment[] | undefined;

      if (stagedFiles.length > 0) {
        attachments = await Promise.all(
          stagedFiles.map(({ file }) => actions.uploadAttachment(file)),
        );
      }

      await actions.sendMessage(text, replyingTo?.id, attachments);

      onClearFiles();
      setText('');
      onCancelReply();
      actions.setTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    } catch {
      // TODO: surface a toast — attachments that fail to upload are left staged so the user can retry
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pt-2">
      {replyingTo && <ReplyPreview message={replyingTo} onCancel={onCancelReply} />}

      {stagedFilesError && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-xs text-red-300 animate-fadeIn">
          {stagedFilesError}
        </div>
      )}

      {stagedFiles.length > 0 && (
        <div className="flex items-center gap-2 px-4 mb-2 overflow-x-auto custom-scrollbar">
          {stagedFiles.map((staged, index) => (
            <div
              key={index}
              className="group relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-white/5"
            >
              {staged.file.type.startsWith('image/') ? (
                <img
                  src={staged.previewUrl}
                  alt={staged.file.name}
                  onClick={() => setEditingIndex(index)}
                  className="w-full h-full object-cover cursor-pointer"
                />
              ) : staged.file.type.startsWith('video/') ? (
                <video src={staged.previewUrl} className="w-full h-full object-cover" muted />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <FileIcon size={20} />
                </div>
              )}

              <button
                onClick={() => onRemoveFile(index)}
                className="absolute inset-0 flex items-start justify-end p-1 bg-black/0 group-hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100"
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-black/80 text-white hover:bg-black">
                  <X size={11} />
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1 px-4 pb-4">
        <div className="relative pb-[3px]">
          <AttachMenu
            isGroup={isGroup}
            disabled={isSending || stagedFiles.length >= MAX_ATTACHMENTS_PER_MESSAGE}
            onPickMedia={onAddFiles}
            onPickFile={onAddFiles}
            onTogglePoll={() => togglePopover('poll')}
          />
          {openPopover === 'poll' && <PollComposer onClose={() => setOpenPopover(null)} />}
        </div>

        <div className="flex-1 flex items-end gap-2 bg-white/5 border border-white/5 rounded-3xl pl-4 pr-2 py-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none resize-none py-2 custom-scrollbar leading-normal"
          />

          <div className="flex items-center gap-1 pb-1 flex-shrink-0">
            <AddEmojiButton
              isOpen={openPopover === 'emoji'}
              onToggle={() => togglePopover('emoji')}
              onEmojiSelect={handleEmojiSelect}
            />
            <AddGifButton
              isOpen={openPopover === 'gif'}
              onToggle={() => togglePopover('gif')}
              onGifSelect={handleGifSelect}
            />
            <button
              title="Voice message (coming soon)"
              disabled
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-600 cursor-not-allowed"
            >
              <Mic size={18} />
            </button>
          </div>
        </div>
      </div>

      {editingIndex !== null && stagedFiles[editingIndex] && (
        <ImageEditorModal
          file={stagedFiles[editingIndex].file}
          onCancel={() => setEditingIndex(null)}
          onSave={(editedFile) => {
            onReplaceFile(editingIndex, editedFile);
            setEditingIndex(null);
          }}
        />
      )}
    </div>
  );
}
