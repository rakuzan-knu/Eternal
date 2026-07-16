import React, { useRef, useState } from 'react';
import { Upload, X as XIcon } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { reportApi } from '../api/reportApi';

const AREA_OPTIONS = ['Home', 'Profile', 'Messanger', 'Feed', 'Other'];

interface ReportDetailsModalProps {
  onClose: () => void;
  onBack: () => void;
}

export function ReportDetailsModal({ onClose, onBack }: ReportDetailsModalProps) {
  const [description, setDescription] = useState('');
  const [area, setArea] = useState(AREA_OPTIONS[0]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!description.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await reportApi.submitReport({ description, area, screenshot });
      setIsSent(true);
      setTimeout(onClose, 1500);
    } catch {
      setSubmitError('Failed to send the report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <Modal onClose={onClose} title="Problem report" widthClassName="max-w-md">
        <p className="text-sm text-gray-300 py-6 text-center">Thank you! Report sent.</p>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} onBack={onBack} title="Report details" widthClassName="max-w-md">
      <div className="flex flex-col gap-4">
        <div>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what exactly isn't working."
            className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">You can also insert an image directly here.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Section</label>
          <Select value={area} onChange={setArea} options={AREA_OPTIONS} />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5">Applications</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
          />
          {screenshot ? (
            <div className="flex items-center justify-between bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-gray-300">
              <span className="truncate">{screenshot.name}</span>
              <button
                type="button"
                onClick={() => setScreenshot(null)}
                className="text-gray-500 hover:text-white shrink-0"
              >
                <XIcon size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 bg-[#111] border border-[#333] hover:border-neutral-600 rounded-xl px-4 py-2.5 text-sm text-gray-400 transition-colors"
            >
              <Upload size={14} /> Upload a screenshot or video
            </button>
          )}
        </div>

        {submitError && <p className="text-xs text-red-400 font-medium -mt-1">{submitError}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!description.trim() || isSubmitting}
          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {isSubmitting ? 'Sending...' : 'Submit a report'}
        </button>
      </div>
    </Modal>
  );
}
