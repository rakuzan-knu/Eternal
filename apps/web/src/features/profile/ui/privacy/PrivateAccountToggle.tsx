import { useState } from 'react';
import { Lock, Globe } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import Toggle from '@/shared/ui/Toggle';
import { usePrivacy, useUpdatePrivacy } from '../../model/usePrivacy';

export default function PrivateAccountToggle() {
  const { data: privacy } = usePrivacy();
  const updatePrivacy = useUpdatePrivacy();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPrivate = privacy?.isPrivate ?? false;

  const handleToggle = () => {
    if (!isPrivate) {
      setConfirmOpen(true);
      return;
    }
    updatePrivacy.mutate({ isPrivate: false });
  };

  const confirmPrivate = () => {
    updatePrivacy.mutate({ isPrivate: true });
    setConfirmOpen(false);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-white">
          {isPrivate ? <Lock size={18} /> : <Globe size={18} />}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Private account</h3>
          <p className="mt-1 text-xs text-gray-400 leading-relaxed">
            When your account is private, only followers you approve can see your profile and
            activity. New followers must send a request.
          </p>
        </div>
        <Toggle checked={isPrivate} onChange={handleToggle} aria-label="Private account" />
      </div>

      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)}>
          {(requestClose) => (
            <div className="w-full max-w-sm rounded-3xl border border-black/10 dark:border-white/10 glass-modal shadow-2xl p-7 text-center text-gray-950 dark:text-white backdrop-blur-3xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4 text-gray-950 dark:text-white">
                <Lock size={26} className="text-gray-950 dark:text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">
                Make account private?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                People will have to send a follow request that you approve. Your current followers
                stay. Non-followers will only see your name and photo.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 h-11 rounded-full text-sm font-semibold bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 text-gray-950 dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmPrivate();
                    requestClose();
                  }}
                  className="flex-1 h-11 rounded-full text-sm font-semibold bg-gray-950 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-white/90 transition cursor-pointer shadow-md"
                >
                  Make private
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
