import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MessageCircle,
  UserRound,
  Crown,
  ShieldCheck,
  ShieldOff,
  UserX,
} from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { ConversationView, ParticipantView } from '../../../entities/chat/model/types';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { chatApi } from '../api/chatApi';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import {
  usePromoteMember,
  useDemoteMember,
  useRemoveMember,
} from '../model/useConversationMutations';

interface GroupMemberDetailViewProps {
  conversation: ConversationView;
  participant: ParticipantView;
  canManage: boolean;
  onBack: () => void;
}

export default function GroupMemberDetailView({
  conversation,
  participant,
  canManage,
  onBack,
}: GroupMemberDetailViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isWorking, setIsWorking] = useState(false);
  const promoteMember = usePromoteMember();
  const demoteMember = useDemoteMember();
  const removeMember = useRemoveMember();

  const startDirectMessage = useMutation({
    mutationFn: () => chatApi.createDirectConversation(participant.userId),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      navigate(`/messages/${conv.id}`);
    },
  });

  const name = participant.nickname ?? participant.user.displayName ?? participant.user.username;

  return (
    <>
      <div className="flex items-center gap-2 px-3 h-16 flex-shrink-0 border-b border-white/5">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-bold text-white truncate">{name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative mb-3">
            <Avatar size="xl" src={participant.user.avatar} />
            <OnlineStatusIndicator userId={participant.userId} variant="dot" size="md" />
          </div>
          <div className="flex items-center justify-center gap-1.5 min-w-0">
            <p className="text-lg font-bold text-white truncate">{name}</p>
            {participant.user.isVerified && <VerifiedCheckmark size="md" />}
          </div>
          <OnlineStatusIndicator
            userId={participant.userId}
            variant="text"
            className="text-sm mt-0.5"
          />
          {(participant.role === 'OWNER' || participant.role === 'ADMIN') && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              {participant.role === 'OWNER' ? (
                <Crown size={12} className="text-yellow-500" />
              ) : (
                <ShieldCheck size={12} className="text-blue-400" />
              )}
              {participant.role === 'OWNER' ? 'Group owner' : 'Group admin'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-5">
          <button
            disabled={startDirectMessage.isPending}
            onClick={() => startDirectMessage.mutate()}
            className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10">
              <MessageCircle size={17} />
            </span>
            <span className="text-[11px] font-medium">Message</span>
          </button>
          <a
            href={`/${participant.user.username}`}
            className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-300 hover:bg-white/5 transition-colors"
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10">
              <UserRound size={17} />
            </span>
            <span className="text-[11px] font-medium">Profile</span>
          </a>
        </div>

        {canManage && participant.role !== 'OWNER' && (
          <>
            <div className="h-px bg-white/5 my-2" />
            <div className="flex flex-col gap-0.5 mt-2">
              {participant.role === 'ADMIN' ? (
                <button
                  disabled={isWorking}
                  onClick={() => {
                    setIsWorking(true);
                    demoteMember.mutate(
                      { conversationId: conversation.id, userId: participant.userId },
                      { onSettled: () => setIsWorking(false) },
                    );
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors"
                >
                  <ShieldOff size={17} className="text-gray-400" />
                  <span className="text-sm font-medium">Remove as admin</span>
                </button>
              ) : (
                <button
                  disabled={isWorking}
                  onClick={() => {
                    setIsWorking(true);
                    promoteMember.mutate(
                      { conversationId: conversation.id, userId: participant.userId },
                      { onSettled: () => setIsWorking(false) },
                    );
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors"
                >
                  <ShieldCheck size={17} className="text-gray-400" />
                  <span className="text-sm font-medium">Make admin</span>
                </button>
              )}
              <button
                disabled={isWorking}
                onClick={() => {
                  if (!window.confirm(`Remove ${name} from the group?`)) return;
                  setIsWorking(true);
                  removeMember.mutate(
                    { conversationId: conversation.id, userId: participant.userId },
                    { onSuccess: onBack, onSettled: () => setIsWorking(false) },
                  );
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <UserX size={17} />
                <span className="text-sm font-medium">Remove from group</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
