import React, { useState, useRef } from 'react';
import { X, Music2, Edit3, Lock, Globe, Trash2 } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import type { MusicPlaylist } from '../model/types';

interface EditPlaylistDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: MusicPlaylist;
}

export const EditPlaylistDetailsModal: React.FC<EditPlaylistDetailsModalProps> = ({
  isOpen,
  onClose,
  playlist,
}) => {
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description || '');
  const [coverUrl, setCoverUrl] = useState(playlist.coverUrl || '');
  const [isPrivate, setIsPrivate] = useState<boolean>(Boolean(playlist.isPrivate));
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const updatePlaylistDetails = useMusicHubStore((s) => s.updatePlaylistDetails);

  const showToast = (toastTitle: string, body: string) => {
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: '',
      messageId: '',
      title: toastTitle,
      body,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 10MB limit (10 * 1024 * 1024 bytes)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const err = 'File size exceeds 10 MB. Please choose a smaller file.';
      setFileError(err);
      showToast('Upload error', err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverUrl(reader.result);
        showToast('Cover selected', 'Image successfully attached to playlist.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    updatePlaylistDetails(playlist.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      isPrivate,
    });

    showToast('Changes saved', `Playlist "${title.trim()}" updated successfully.`);

    onClose();
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-xl">
      {(close) => (
        <div className="bg-[#282828] text-white rounded-3xl p-6 shadow-2xl flex flex-col select-none border border-white/10 animate-scaleUp">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h2 className="text-xl font-bold tracking-tight text-white">Edit details</h2>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="pt-5 flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-6 items-start">
              {/* Left column: Cover photo upload + Privacy toggle */}
              <div className="flex flex-col items-center sm:items-stretch gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group w-44 h-44 sm:w-full aspect-square rounded-xl bg-[#18181c] border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer shadow-lg hover:border-white/25 transition-all"
                >
                  {coverUrl ? (
                    <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-500">
                      <Music2 size={64} strokeWidth={1.5} />
                    </div>
                  )}

                  {/* Hover overlay: Spotify style pencil */}
                  <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 text-white transition-opacity">
                    <Edit3 size={24} className="text-white drop-shadow" />
                    <span className="text-xs font-bold text-center px-2">Choose photo</span>
                  </div>
                </div>

                {coverUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors py-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Remove cover</span>
                  </button>
                )}

                {fileError && (
                  <p className="text-[11px] text-red-400 text-center leading-tight">{fileError}</p>
                )}

                {/* Privacy toggle pill button */}
                <button
                  type="button"
                  onClick={() => setIsPrivate((prev) => !prev)}
                  className={`mt-1 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    isPrivate
                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30'
                      : 'bg-white/5 border-white/15 text-gray-200 hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  {isPrivate ? (
                    <>
                      <Lock size={13} className="text-purple-400 shrink-0" />
                      <span className="truncate">Make public</span>
                    </>
                  ) : (
                    <>
                      <Globe size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">Make private</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right column: Title & Description inputs */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-300 tracking-wide">Name</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Playlist"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#3e3e3e]/70 focus:bg-[#333338] border border-transparent focus:border-white/30 text-sm font-semibold text-white placeholder-gray-400 outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-300 tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add an optional description"
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#3e3e3e]/70 focus:bg-[#333338] border border-transparent focus:border-white/30 text-sm text-white placeholder-gray-400 outline-none resize-none transition-all"
                  />
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="px-8 py-3 rounded-full bg-white hover:bg-gray-100 text-black text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <div className="pt-4 mt-5 border-t border-white/5">
              <p className="text-[11px] text-gray-400 leading-snug">
                By continuing, you agree to grant Eternal access to the selected image. Make sure
                you have the right to use it.
              </p>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};
