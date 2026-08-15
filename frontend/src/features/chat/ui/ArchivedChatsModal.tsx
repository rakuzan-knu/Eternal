import React, { useMemo, useState } from 'react';
import { Lock, X, Maximize2, Minimize2, KeyRound, MessageSquare, ShieldCheck } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { ConversationView } from '../../../entities/chat/model/types';
import { useConversations } from '../model/useConversations';
import ArchivePasswordGate from './ArchivePasswordGate';
import ArchivedList from './ArchivedList';
import ArchivedThreadPane from './ArchivedThreadPane';

interface ArchivedChatsModalProps {
  onClose: () => void;
}

function getActivityTime(conversation: ConversationView) {
  const activityAt =
    conversation.lastMessage?.createdAt ?? conversation.updatedAt ?? conversation.createdAt;
  const time = new Date(activityAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default function ArchivedChatsModal({ onClose }: ArchivedChatsModalProps) {
  const { userId } = useAuthStore();
  const { data: conversations } = useConversations();
  const [unlocked, setUnlocked] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const archived = useMemo(
    () =>
      (conversations ?? [])
        .filter((c: ConversationView) => c.isArchived)
        .sort(
          (a: ConversationView, b: ConversationView) => getActivityTime(b) - getActivityTime(a),
        ),
    [conversations],
  );

  const activeConversation = archived.find((c: ConversationView) => c.id === activeId) ?? null;
  if (activeId && !activeConversation) setActiveId(null);

  const sizeClass = isExpanded
    ? 'w-screen h-screen rounded-none'
    : 'w-[min(1100px,94vw)] h-[min(760px,90vh)] rounded-3xl';

  return (
    <Modal onClose={onClose} className={sizeClass}>
      {(close) => (
        <div
          className={`relative flex h-full w-full flex-col overflow-hidden border border-white/10 bg-[#0b0b0c]/95 shadow-2xl backdrop-blur-2xl ${
            isExpanded ? 'rounded-none' : 'rounded-3xl'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-radial-gradient opacity-60" />

          <header className="relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Lock size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-white">Archived chats</h2>
                <p className="flex items-center gap-1.5 truncate text-[12px] text-gray-400">
                  <ShieldCheck size={13} className="flex-shrink-0 text-emerald-400" />
                  End-to-end encryption · Only you
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {unlocked && (
                <button
                  onClick={() => {
                    setUnlocked(false);
                    setActiveId(null);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] font-medium text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <KeyRound size={14} />
                  Password
                </button>
              )}
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                title={isExpanded ? 'Collapse' : 'Expand'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {!unlocked ? (
            <ArchivePasswordGate onUnlock={() => setUnlocked(true)} />
          ) : (
            <div className="relative flex min-h-0 flex-1">
              <ArchivedList
                conversations={archived}
                currentUserId={userId}
                activeId={activeId}
                onSelect={setActiveId}
              />
              <div className="flex min-w-0 flex-1 flex-col border-l border-white/10">
                {activeConversation ? (
                  <ArchivedThreadPane
                    key={activeConversation.id}
                    conversation={activeConversation}
                    onUnarchived={() => setActiveId(null)}
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-500">
                    <MessageSquare size={38} />
                    <p className="text-sm font-medium">
                      {archived.length > 0
                        ? 'Select an archived chat to view its history'
                        : 'You have no archived chats'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
