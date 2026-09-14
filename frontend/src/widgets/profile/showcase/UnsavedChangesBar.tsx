import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface UnsavedChangesBarProps {
  isVisible: boolean;
  onReset: () => void;
  onSave: () => void;
  isSaving?: boolean;
  message?: string;
  resetText?: string;
  saveText?: string;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({
  isVisible,
  onReset,
  onSave,
  isSaving = false,
  message = 'Remember to save your changes!',
  resetText = 'Reset',
  saveText = 'Save',
}) => {
  const content = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="unsaved-changes-bar"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto"
        >
          <div
            className="flex items-center justify-between gap-6 px-5 py-3 rounded-2xl bg-[#111214]/95 border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl min-w-[320px] sm:min-w-[420px] max-w-[94vw]"
            style={{
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Warning Message */}
            <span className="text-xs sm:text-sm font-semibold text-gray-200 tracking-tight">
              {message}
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onReset}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:underline transition-all cursor-pointer disabled:opacity-50"
              >
                {resetText}
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_4px_16px_rgba(88,101,242,0.35)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{saveText}...</span>
                  </>
                ) : (
                  <span>{saveText}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
