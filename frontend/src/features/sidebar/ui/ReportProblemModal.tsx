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
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Problem report</h2>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-sm text-gray-300 leading-relaxed space-y-3">
            <p>
              Need help? Check out our{' '}
              <Link
                to="/faq"
                onClick={close}
                className="text-purple-400 hover:underline font-medium"
              >
                Help Center
              </Link>{' '}
              — maybe the answer is already there.
            </p>
            <p className="text-gray-400">
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
