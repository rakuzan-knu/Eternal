import React, { useState } from 'react';
import type { MessageView } from '../../../entities/chat/model/types';
import type { ThemeProposalData } from '../model/chatTheme';
import { parseChatTheme, getChatBackgroundStyle } from '../lib/themeUtils';
import { chatApi } from '../api/chatApi';
import { triggerCircularRippleTransition } from '../lib/themeRippleTransition';
import { Sparkles, Check, X, Ban, Clock } from 'lucide-react';

interface ThemeProposalMessageProps {
  message: MessageView;
  currentUserId: string;
  conversationId: string;
  onThemeAccepted?: (themeString: string) => void;
}

export const ThemeProposalMessage: React.FC<ThemeProposalMessageProps> = ({
  message,
  currentUserId,
  conversationId,
  onThemeAccepted,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let proposalData: ThemeProposalData | null = null;
  try {
    if (message.body) {
      proposalData = JSON.parse(message.body) as ThemeProposalData;
    }
  } catch {
    proposalData = null;
  }

  if (!proposalData) {
    return (
      <div className="p-3 my-2 text-xs text-white/50 bg-white/5 border border-white/10 rounded-2xl">
        Не удалось загрузить данные темы
      </div>
    );
  }

  const parsedTheme = parseChatTheme(proposalData.proposedTheme);
  const bgStyle = getChatBackgroundStyle(parsedTheme);
  const isAuthor = proposalData.proposedByUserId === currentUserId;
  const isPending = proposalData.status === 'PENDING';
  const isAccepted = proposalData.status === 'ACCEPTED';
  const isDeclined = proposalData.status === 'DECLINED';
  const isCancelled = proposalData.status === 'CANCELLED';

  const handleRespond = async (action: 'ACCEPT' | 'DECLINE' | 'CANCEL', e: React.MouseEvent) => {
    try {
      setIsLoading(true);
      setError(null);
      await chatApi.respondThemeProposal(conversationId, message.id, action);

      if (action === 'ACCEPT') {
        triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
          onThemeAccepted?.(proposalData!.proposedTheme);
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось обновить тему';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="my-3 w-full max-w-[340px] mx-auto rounded-3xl overflow-hidden border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-white/25"
      style={{
        background:
          'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      }}
    >
      {/* Header with Title & Badge */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white/95 tracking-wide">
              {isAuthor
                ? 'Вы предложили парную тему'
                : `${proposalData.proposedByUsername || 'Собеседник'} предлагает парную тему`}
            </div>
            <div className="text-[10px] text-white/50">Instagram x Apple Shared Theme</div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isPending && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Clock className="w-3 h-3" />
              Ожидание
            </span>
          )}
          {isAccepted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Check className="w-3 h-3" />
              Принята
            </span>
          )}
          {isDeclined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <X className="w-3 h-3" />
              Отклонена
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/50 border border-white/10">
              <Ban className="w-3 h-3" />
              Отменена
            </span>
          )}
        </div>
      </div>

      {/* Mini Interactive Preview Area */}
      <div className="p-3">
        <div
          className="relative h-28 w-full rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between p-2.5 shadow-inner"
          style={bgStyle}
        >
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          {/* Incoming Preview Bubble */}
          <div className="relative z-10 self-start max-w-[80%] rounded-2xl rounded-tl-sm px-2.5 py-1.5 text-[11px] font-medium shadow-md bg-white/20 text-white backdrop-blur-md border border-white/15">
            Привет! Как тебе эта тема? ✨
          </div>

          {/* Outgoing Preview Bubble */}
          <div
            className="relative z-10 self-end max-w-[80%] rounded-2xl rounded-tr-sm px-2.5 py-1.5 text-[11px] font-medium shadow-md border border-white/15"
            style={{
              backgroundColor: parsedTheme.bubbleColor || '#6366f1',
              color: '#ffffff',
            }}
          >
            Выглядит невероятно круто! 🚀
          </div>
        </div>

        {error && <div className="mt-2 text-[11px] text-rose-400 text-center">{error}</div>}
      </div>

      {/* Action Footer */}
      {isPending && (
        <div className="p-3 pt-0 flex items-center gap-2">
          {!isAuthor ? (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => handleRespond('ACCEPT', e)}
                className="flex-1 py-2 px-3 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Принять тему
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => handleRespond('DECLINE', e)}
                className="py-2 px-3 rounded-xl font-medium text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Отклонить
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => handleRespond('CANCEL', e)}
              className="w-full py-2 px-3 rounded-xl font-medium text-xs text-white/60 hover:text-rose-300 bg-white/5 hover:bg-rose-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              Отменить предложение
            </button>
          )}
        </div>
      )}
    </div>
  );
};
