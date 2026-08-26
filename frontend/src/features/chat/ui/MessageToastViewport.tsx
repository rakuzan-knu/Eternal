import React from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { ConversationView } from '../../../entities/chat/model/types';
import { chatApi } from '../api/chatApi';

import { useNotificationSettingsStore } from '@/shared/model/useNotificationSettingsStore';

export default function MessageToastViewport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, removeToast, dismissAll } = useMessageToastStore();
  const { toastPosition, maxToasts } = useNotificationSettingsStore();

  const openToast = (toast: (typeof toasts)[0]) => {
    removeToast(toast.id);
    if (toast.linkUrl) {
      navigate(toast.linkUrl);
      return;
    }
    if (toast.conversationId) {
      queryClient.setQueryData<ConversationView[]>(
        [CONVERSATIONS_KEY],
        (prev: ConversationView[] | undefined) =>
          prev?.map((conversation: ConversationView) =>
            conversation.id === toast.conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
      );
      chatApi.markRead(toast.conversationId).catch(() => {});
      navigate(`/messages/${toast.conversationId}?messageId=${toast.messageId}`);
    }
  };

  const visibleToasts = toasts.slice(0, maxToasts);

  if (visibleToasts.length === 0) return null;

  const positionClasses = {
    'top-left': 'top-5 left-5 flex-col',
    'top-right': 'top-5 right-5 flex-col',
    'bottom-left': 'bottom-5 left-5 flex-col-reverse',
    'bottom-right': 'bottom-5 right-5 flex-col-reverse',
  }[toastPosition || 'bottom-right'];

  return (
    <div
      className={`fixed z-[350] flex w-[min(380px,calc(100vw-2.5rem))] gap-2 pointer-events-none transition-all duration-300 ${positionClasses}`}
    >
      {toasts.length >= 3 && (
        <button
          type="button"
          onClick={dismissAll}
          className="pointer-events-auto h-9 px-4 rounded-2xl border border-white/[0.12] bg-[#12141e]/75 text-xs font-semibold text-white/80 shadow-[0_10px_25px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-all duration-200 hover:bg-[#181a28]/85 hover:text-white hover:border-white/20 active:scale-95 mx-auto"
        >
          Dismiss all
        </button>
      )}

      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          role="button"
          tabIndex={0}
          onClick={() => openToast(toast)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openToast(toast);
            }
          }}
          className="pointer-events-auto group relative flex min-h-[76px] items-center gap-3.5 rounded-[22px] border border-white/[0.14] bg-[#12141e]/72 px-4 py-3 shadow-[0_16px_42px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out animate-slideInRight hover:bg-[#181a28]/82 hover:border-white/[0.22] hover:shadow-[0_20px_48px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.22)] cursor-pointer"
        >
          <div className="flex-shrink-0">
            {toast.isGroup ? (
              toast.avatar ? (
                <Avatar size="md" src={toast.avatar} />
              ) : toast.memberAvatars.length > 0 ? (
                <GroupAvatarCollage avatars={toast.memberAvatars} size={40} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-base shadow-md">
                  E
                </div>
              )
            ) : toast.avatar ? (
              <Avatar size="md" src={toast.avatar} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-base shadow-md">
                E
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <p className="truncate text-[13.5px] font-semibold text-white/95 tracking-tight">
              {toast.title}
            </p>
            <p className="line-clamp-2 text-[12.5px] leading-snug text-white/70 mt-0.5">
              {toast.body}
            </p>
          </div>

          {toast.linkUrl && (
            <span className="flex-shrink-0 text-[11px] font-semibold text-sky-400 group-hover:underline pr-4">
              View
            </span>
          )}

          <div className="absolute right-3.5 top-3 flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-white/40 select-none">now</span>
            <button
              type="button"
              aria-label="Close notification"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
