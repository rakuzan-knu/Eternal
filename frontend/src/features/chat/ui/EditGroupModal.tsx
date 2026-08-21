import React, { useState, useRef, useEffect } from 'react';
import { X, Users, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import Modal from '../../../shared/ui/Modal';

import { ConversationView } from '../../../entities/chat/model/types';
import { useUpdateGroup } from '../model/useConversationMutations';
import { chatApi } from '../api/chatApi';
import { useQueryClient } from '@tanstack/react-query';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';

interface EditGroupModalProps {
  conversation: ConversationView;
  onClose: () => void;
  onOpenParticipants: () => void;
  onOpenAdmins: () => void;
}

export default function EditGroupModal({
  conversation,
  onClose,
  onOpenParticipants,
  onOpenAdmins,
}: EditGroupModalProps) {
  const [name, setName] = useState(conversation.name ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(conversation.avatar ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
      }
    };
  }, []);

  const updateGroup = useUpdateGroup();
  const queryClient = useQueryClient();

  const adminCount = conversation.participants.filter(
    (p) => p.role === 'OWNER' || p.role === 'ADMIN',
  ).length;
  const memberCount = conversation.participants.length;

  const safeAvatarPreview =
    avatarPreview &&
    (avatarPreview.startsWith('blob:') ||
      avatarPreview.startsWith('https://') ||
      avatarPreview.startsWith('http://'))
      ? avatarPreview
      : null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
    }
    const newUrl = URL.createObjectURL(file);
    lastObjectUrlRef.current = newUrl;
    setAvatarFile(file);
    setAvatarPreview(newUrl);
    setErrorMsg(null);
  };

  const handleSave = async (requestClose: () => void) => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      const trimmed = name.trim();

      if (avatarFile) {
        await chatApi.uploadGroupAvatar(conversation.id, avatarFile);
      }

      if (trimmed && trimmed !== conversation.name) {
        await updateGroup.mutateAsync({ conversationId: conversation.id, name: trimmed });
      }

      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      requestClose();
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to update group');
    }
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#181926]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-lg font-bold text-white">Edit group</h2>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {/* Group Avatar & Name Input */}
          <div className="flex items-center gap-4 px-5 pb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/gif,.gif"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Avatar container with smooth black hover fade & camera icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border-2 border-white/10 hover:border-purple-500/50 shadow-md transition-all duration-300"
              title="Click to change group avatar"
            >
              {safeAvatarPreview ? (
                <img
                  src={safeAvatarPreview}
                  alt="Group avatar"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <GroupAvatarCollage
                  avatars={conversation.participants.map((p) => p.user.avatar)}
                  size={64}
                />
              )}

              {/* Hover Dark Overlay with Camera / Loading Icon */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-[1px]">
                {isSaving ? (
                  <Loader2 size={20} className="animate-spin text-purple-400" />
                ) : (
                  <Camera
                    size={20}
                    className="text-purple-300 group-hover:scale-110 transition-transform"
                  />
                )}
              </div>
            </button>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="flex-1 h-11 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.08] transition-all"
            />
          </div>

          {/* Admins and Participants rows */}
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => onOpenAdmins()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors active:scale-[0.99] cursor-pointer"
            >
              <ShieldCheck size={17} className="text-purple-400" />
              <span className="flex-1 text-sm font-medium">Admins</span>
              <span className="text-sm text-gray-500">{adminCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenParticipants()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors active:scale-[0.99] cursor-pointer"
            >
              <Users size={17} className="text-purple-400" />
              <span className="flex-1 text-sm font-medium">Participants</span>
              <span className="text-sm text-gray-500">{memberCount}</span>
            </button>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="px-5 pb-2">
              <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(close)}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              <span>Save</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
