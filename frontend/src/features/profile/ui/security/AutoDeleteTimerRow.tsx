import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import RadioGroup from '@/shared/ui/RadioGroup';
import SettingsRow from '@/shared/ui/SettingsRow';
import SlideOverPanel from '@/shared/ui/SlideOverPanel';
import { usePrivacy, useUpdatePrivacy } from '../../model/usePrivacy';
import type { AutoDeletePeriod } from '@/entities/profile/model/types';

const OPTIONS: { value: AutoDeletePeriod; label: string; description?: string }[] = [
  { value: 'OFF', label: 'Disabled', description: 'Messages are saved forever.' },
  { value: 'DAY', label: 'After 1 day' },
  { value: 'WEEK', label: 'After 1 week' },
  { value: 'MONTH', label: 'After 1 month' },
  { value: 'QUARTER', label: 'After 3 months' },
];

const LABEL: Record<AutoDeletePeriod, string> = {
  OFF: 'Disabled',
  DAY: 'After 1 day',
  WEEK: 'After 1 week',
  MONTH: 'After 1 month',
  QUARTER: 'After 3 months',
};

export default function AutoDeleteTimerRow() {
  const { data: privacy } = usePrivacy();
  const updatePrivacy = useUpdatePrivacy();

  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<AutoDeletePeriod | null>(null);

  const current: AutoDeletePeriod = privacy?.autoDeletePeriod ?? 'OFF';

  const handleSelect = (value: AutoDeletePeriod) => {
    if (value === current) {
      setPanelOpen(false);
      return;
    }
    if (value !== 'OFF') {
      setPendingPeriod(value);
      return;
    }
    updatePrivacy.mutate({ autoDeletePeriod: value });
    setPanelOpen(false);
  };

  const confirm = () => {
    if (pendingPeriod) updatePrivacy.mutate({ autoDeletePeriod: pendingPeriod });
    setPendingPeriod(null);
    setPanelOpen(false);
  };

  return (
    <>
      <SettingsRow
        icon={<Trash2 size={17} />}
        title="Auto-Delete Timer"
        subtitle="Automatically delete your messages after a selected time."
        value={LABEL[current]}
        onClick={() => setPanelOpen(true)}
      />

      {panelOpen && (
        <SlideOverPanel title="Auto-Delete Timer" onClose={() => setPanelOpen(false)}>
          <RadioGroup value={current} options={OPTIONS} onChange={handleSelect} />
        </SlideOverPanel>
      )}

      {pendingPeriod && (
        <Modal onClose={() => setPendingPeriod(null)}>
          {(requestClose) => (
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a1a1a] shadow-2xl p-7 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Enable Auto-Delete Timer?</h2>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Your messages older than{' '}
                <span className="text-gray-200 font-medium">
                  &laquo;{LABEL[pendingPeriod]}&raquo;
                </span>{' '}
                will be permanently deleted according to the schedule, along with attachments. This
                cannot be undone.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 h-11 rounded-full text-sm font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirm();
                    requestClose();
                  }}
                  className="flex-1 h-11 rounded-full text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Enable
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
