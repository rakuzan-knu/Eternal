import { invitationTokenFromInput } from './invitationLink';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, X } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import { communityButton, communityInput } from './communityStyles';

export function CommunityJoinDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const title = useId();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  return (
    <Modal onClose={onClose} aria-labelledby={title} closeOnInputEscape>
      {(close) => (
        <form
          noValidate
          className="w-full max-w-md rounded-3xl border border-[var(--app-border-subtle)] bg-[var(--app-surface-card)] p-6 text-[var(--app-text-primary)] space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const token = invitationTokenFromInput(value);
            if (!token) {
              setInvalid(true);
              document.getElementById(inputId)?.focus();
              return;
            }
            // Always navigate internally; a pasted host cannot redirect the person away.
            navigate(`/invite/${token}`);
            onClose();
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={title} className="text-xl font-bold">
                Join a community
              </h2>
              <p className="text-sm text-[var(--app-text-secondary)] mt-2">
                Paste an invitation to preview the community before joining.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className={communityButton}
              aria-label="Close join dialog"
            >
              <X size={18} />
            </button>
          </div>
          <div>
            <label htmlFor={inputId} className="text-sm font-semibold">
              Invitation link
            </label>
            <input
              id={inputId}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setInvalid(false);
              }}
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={2048}
              placeholder="https://…/invite/…"
              className={`${communityInput} mt-2`}
              aria-invalid={invalid}
              aria-describedby={invalid ? errorId : undefined}
            />
            {invalid && (
              <p id={errorId} role="alert" className="mt-2 text-sm text-red-400">
                Use a complete invitation link or the invitation code from an admin.
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={communityButton} onClick={close}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${communityButton} bg-[var(--app-accent-color)] text-white`}
            >
              <Link2 size={16} />
              Preview invitation
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
