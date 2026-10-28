import React, { useId, useRef, useState } from 'react';
import { X, ChevronRight, Flag } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { chatApi } from '../api/chatApi';

interface ReportConversationModalProps {
  userId: string;
  conversationId?: string;
  onClose: () => void;
  context?: 'conversation' | 'profile';
}

const REPORT_REASONS = [
  'I just don’t like it.',
  'Harassment or unwanted contact',
  'Suicide, self-harm, or eating disorders',
  'Violence, hostility or exploitation',
  'Selling or promoting restricted goods',
  'Naked body/sexual activity',
  'Fraud, deception, or spam',
  'False information',
];

export default function ReportConversationModal({
  userId,
  conversationId,
  onClose,
  context = 'conversation',
}: ReportConversationModalProps) {
  const titleId = useId();
  const [pendingReason, setPendingReason] = useState<string | null>(null);
  const [failedReason, setFailedReason] = useState<string | null>(null);
  const sending = useRef(false);
  const handleSelectReason = async (reason: string) => {
    if (sending.current) return;
    sending.current = true;
    setPendingReason(reason);
    setFailedReason(null);
    const category =
      reason === REPORT_REASONS[2]
        ? 'SUICIDE_SELF_HARM'
        : reason === REPORT_REASONS[3]
          ? 'VIOLENCE_DANGEROUS_ORGS'
          : reason === REPORT_REASONS[4]
            ? 'RESTRICTED_GOODS'
            : reason === REPORT_REASONS[5]
              ? 'NUDITY_SEXUAL'
              : reason === REPORT_REASONS[6]
                ? 'FRAUD'
                : 'OTHER';
    try {
      await chatApi.reportUser(
        userId,
        category,
        conversationId ? `${reason}\nConversation: ${conversationId}` : reason,
      );
    } catch {
      setFailedReason(reason);
      return;
    } finally {
      sending.current = false;
      setPendingReason(null);
    }

    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      conversationId: conversationId || '',
      messageId: '',
      title: 'Report Submitted',
      body: 'Thank you for submitting your report. We will review it shortly.',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-md" aria-labelledby={titleId}>
      {(close) => (
        <div className="glass-modal border border-white/10 rounded-3xl w-full shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative flex items-center justify-center px-5 py-4 border-b border-white/10">
            <button
              type="button"
              onClick={close}
              aria-label="Close report"
              className="absolute left-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-red-400" />
              <h3 id={titleId} className="text-base font-bold text-white tracking-tight">
                {context === 'profile' ? 'Report profile' : 'Report conversation'}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 px-1">
              Why are you reporting this {context === 'profile' ? 'profile' : 'conversation'}?
            </h4>

            {failedReason && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl border border-red-400/30 text-sm text-red-300 space-y-2"
              >
                <p>Your report was not sent. Your selected reason is “{failedReason}”.</p>
                <button
                  type="button"
                  onClick={() => void handleSelectReason(failedReason)}
                  disabled={Boolean(pendingReason)}
                  className="min-h-11 px-3 rounded-lg border border-red-400/30 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={Boolean(pendingReason)}
                  aria-busy={pendingReason === reason}
                  onClick={() => handleSelectReason(reason)}
                  className="w-full flex items-center justify-between min-h-11 py-3 px-3 text-sm text-gray-200 hover:text-white hover:bg-white/5 rounded-2xl transition-all text-left cursor-pointer group disabled:opacity-50 disabled:cursor-wait"
                >
                  <span className="font-medium">{reason}</span>
                  {pendingReason === reason && (
                    <span role="status" className="text-xs">
                      Sending…
                    </span>
                  )}
                  <ChevronRight
                    size={16}
                    className="text-gray-500 group-hover:text-gray-300 transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
