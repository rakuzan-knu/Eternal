import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/shared/ui/Modal';

interface ReportProblemModalProps {
  onClose: () => void;
  onContinue: () => void;
}

export function ReportProblemModal({ onClose, onContinue }: ReportProblemModalProps) {
  return (
    <Modal onClose={onClose} title="Problem report" widthClassName="max-w-md">
      <div className="text-sm text-gray-300 leading-relaxed space-y-3">
        <p>
          Need help? Check out our{' '}
          <Link to="/faq" onClick={onClose} className="text-purple-400 hover:underline font-medium">
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
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-gray-400 hover:text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
