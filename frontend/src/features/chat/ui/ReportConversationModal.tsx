import React from 'react';
import { X, ChevronRight, Flag } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { chatApi } from '../api/chatApi';

interface ReportConversationModalProps {
  userId: string;
  conversationId?: string;
  onClose: () => void;
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
}: ReportConversationModalProps) {
  const handleSelectReason = async (_reason: string) => {
    try {
      await chatApi.reportUser(userId, 'OTHER', conversationId);
    } catch {
      // Graceful error handling
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
    <Modal onClose={onClose} className="w-full max-w-md">
      {(close) => (
        <div className="bg-[#181a22] border border-white/10 rounded-3xl w-full shadow-2xl overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="relative flex items-center justify-center px-5 py-4 border-b border-white/10">
            <button
              type="button"
              onClick={close}
              className="absolute left-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-red-400" />
              <h3 className="text-base font-bold text-white tracking-tight">Report conversation</h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 px-1">
              Why are you reporting this conversation?
            </h4>

            <div className="flex flex-col gap-1">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleSelectReason(reason)}
                  className="w-full flex items-center justify-between py-3 px-3 text-sm text-gray-200 hover:text-white hover:bg-white/5 rounded-2xl transition-all text-left cursor-pointer group"
                >
                  <span className="font-medium">{reason}</span>
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
