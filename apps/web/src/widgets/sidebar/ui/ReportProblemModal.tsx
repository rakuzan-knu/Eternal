import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import Modal from '@/shared/ui/Modal';

interface ReportProblemModalProps {
  onClose: () => void;
  onContinue: () => void;
}

export function ReportProblemModal({ onClose, onContinue }: ReportProblemModalProps) {
  return (
    <Modal onClose={onClose} className="w-full max-w-md">
      {(close) => (
        <div className="glass-modal border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl p-5 text-gray-950 dark:text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Problem report</h2>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 text-gray-600 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors active:scale-90"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
            <p>
              Need help? Check out our{' '}
              <Link
                to="/safety"
                onClick={close}
                className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                Help Center
              </Link>{' '}
              — maybe the answer is already there.
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              If that doesn't help, report the error below and we'll look into it.
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-6">
            <button
              type="button"
              onClick={onContinue}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
            >
              Continue to report
            </button>
            <button
              type="button"
              onClick={close}
              className="w-full py-2.5 rounded-xl text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
