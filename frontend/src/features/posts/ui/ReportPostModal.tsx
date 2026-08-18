import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { postsApi } from '../api/postsApi';

interface ReportPostModalProps {
  postId: string | number;
  isOpen: boolean;
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

export function ReportPostModal({ postId, isOpen, onClose }: ReportPostModalProps) {
  if (!isOpen) return null;

  const handleSelectReason = async (reason: string) => {
    try {
      await postsApi.report(postId, reason);
    } catch {
      // Ignored for graceful UI simulation as requested
    }
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      conversationId: '',
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1c20] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center px-5 py-4 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
          <h3 className="text-base font-bold text-white">Complaint</h3>
        </div>

        {/* Content */}
        <div className="p-5">
          <h4 className="text-sm font-semibold text-white mb-3">
            Why are you complaining about this post?
          </h4>

          <div className="divide-y divide-white/5">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => handleSelectReason(reason)}
                className="w-full flex items-center justify-between py-3.5 px-2 text-sm text-gray-200 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all text-left cursor-pointer group"
              >
                <span>{reason}</span>
                <ChevronRight
                  size={18}
                  className="text-gray-500 group-hover:text-gray-300 transition-colors shrink-0"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportPostModal;
