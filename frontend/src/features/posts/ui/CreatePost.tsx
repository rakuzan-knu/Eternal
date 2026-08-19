import React, { useState, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { PollCreator } from './PollCreator';
import { AddFileButton } from './AddFileButton';
import { AddEmojiButton } from '../../../shared/ui/AddEmojiButton';
import { AddGifButton } from '../../../shared/ui/AddGifButton';
import { AddPollButton } from './AddPollButton';
import { MentionAutocomplete } from './MentionAutocomplete';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { PollOptionDraft, MediaDraft } from '../model/types';
import { compressMediaFiles } from '@/shared/lib/compressImage';
import { PostType, PostMedia } from '@/entities/post/model/types';

const MAX_MEDIA = 5;

const emptyPollOptions = (): PollOptionDraft[] => [
  { id: crypto.randomUUID(), text: '' },
  { id: crypto.randomUUID(), text: '' },
];

interface CreatePostProps {
  onSubmitFormData: (fd: FormData, optimisticPost?: Partial<PostType>) => void | Promise<unknown>;
  isPending?: boolean;
}

export default function CreatePost({ onSubmitFormData, isPending = false }: CreatePostProps) {
  const { data: currentUser } = useCurrentUser();
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [activeMenu, setActiveMenu] = useState<'emoji' | 'gif' | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOptionDraft[]>(emptyPollOptions());
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canAddMore = media.length < MAX_MEDIA;
  const isBusy = isPending || isCompressing;

  const handleFilesSelect = async (files: File[]) => {
    const room = MAX_MEDIA - media.length;
    const selected = files.slice(0, room);
    if (selected.length === 0) return;

    try {
      setIsCompressing(true);
      const compressed = await compressMediaFiles(selected);
      const accepted = compressed.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setMedia((prev) => [...prev, ...accepted]);
    } catch {
      // Fallback: use original files if compression fails
      const accepted = selected.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setMedia((prev) => [...prev, ...accepted]);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    if (!canAddMore) return;
    setMedia((prev) => [...prev, { gifUrl, previewUrl: gifUrl }]);
    setActiveMenu(null);
  };

  const removeMedia = (idx: number) => setMedia((prev) => prev.filter((_, i) => i !== idx));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
    if (errorMessage) setErrorMessage(null);
  };

  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPos(target.selectionStart || 0);
  };

  const handleMentionSelect = (newText: string, newPos: number) => {
    setText(newText);
    setCursorPos(newPos);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleSubmit = async () => {
    if ((!text.trim() && media.length === 0) || isBusy) return;

    setErrorMessage(null);

    const fd = new FormData();
    fd.append('content', text.trim());

    const optimisticMedia: PostMedia[] = [];

    media.forEach((m) => {
      if (m.file) {
        fd.append('media', m.file);
        optimisticMedia.push({
          type: m.file.type.startsWith('video') ? 'video' : 'image',
          url: m.previewUrl,
        });
      } else if (m.gifUrl) {
        fd.append('gifUrls', m.gifUrl);
        optimisticMedia.push({
          type: 'image',
          url: m.gifUrl,
        });
      }
    });

    const validOptions = pollOptions.map((o) => o.text.trim()).filter(Boolean);
    let optimisticPoll = null;

    if (showPoll && validOptions.length >= 2) {
      fd.append('poll', JSON.stringify(validOptions));
      optimisticPoll = {
        id: `poll-temp-${Date.now()}`,
        totalVotes: 0,
        myVoteOptionId: null,
        options: validOptions.map((text, i) => ({
          id: `opt-${i}`,
          text,
          votes: 0,
        })),
      };
    }

    try {
      await onSubmitFormData(fd, {
        media: optimisticMedia,
        poll: optimisticPoll,
      });

      setText('');
      setMedia([]);
      setShowPoll(false);
      setActiveMenu(null);
      setPollOptions(emptyPollOptions());
    } catch {
      setErrorMessage('Failed to publish post. Please check your connection and try again.');
    }
  };

  return (
    <div className="w-full bg-[#111111] border border-white/[0.05] rounded-3xl p-4 flex flex-col gap-3 relative">
      {errorMessage && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-300 font-bold ml-2 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex gap-4 items-start">
        <Avatar size="md" src={currentUser?.avatar} />
        <div className="flex-1 flex flex-col gap-3 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            placeholder="What's new?"
            disabled={isBusy}
            className="w-full bg-transparent resize-none text-white placeholder-gray-500 focus:outline-none text-[15px] min-h-[50px] pt-2 disabled:opacity-60"
          />

          <MentionAutocomplete text={text} cursorPos={cursorPos} onSelect={handleMentionSelect} />

          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((m, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden border border-white/10 aspect-square group"
                >
                  {m.file?.type.startsWith('video') ? (
                    <video src={m.previewUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={m.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  )}
                  {!isBusy && (
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-1 rounded-full text-white transition-all cursor-pointer"
                      aria-label="Remove media"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PollCreator
        isOpen={showPoll}
        options={pollOptions}
        onChange={setPollOptions}
        onClose={() => setShowPoll(false)}
      />

      <div className="h-px bg-white/5 w-full mt-2" />

      <div className="flex justify-between items-center relative">
        <div className="flex gap-1 -ml-2">
          <AddFileButton
            onFilesSelect={handleFilesSelect}
            disabled={!canAddMore || isBusy}
            multiple
          />
          <AddEmojiButton
            isOpen={activeMenu === 'emoji'}
            onToggle={() => setActiveMenu((v) => (v === 'emoji' ? null : 'emoji'))}
            onEmojiSelect={(e) => {
              setText((p) => p + e);
              setCursorPos((p) => p + e.length);
            }}
            usePortal={true}
          />
          <AddGifButton
            isOpen={activeMenu === 'gif'}
            onToggle={() => setActiveMenu((v) => (v === 'gif' ? null : 'gif'))}
            onGifSelect={handleGifSelect}
            usePortal={true}
          />
          <AddPollButton isOpen={showPoll} onToggle={() => setShowPoll((v) => !v)} />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!text.trim() && media.length === 0) || isBusy}
          className="flex items-center gap-1.5 bg-white text-black font-bold px-5 py-1.5 rounded-full hover:bg-gray-200 disabled:opacity-40 transition-all text-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {isBusy && <Loader2 size={14} className="animate-spin" />}
          {isBusy ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
