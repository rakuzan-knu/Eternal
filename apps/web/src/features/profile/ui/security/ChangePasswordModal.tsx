import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, Loader2, X } from 'lucide-react';
import { AxiosError } from 'axios';
import Modal from '@/shared/ui/Modal';
import { useChangePassword } from '../../model/useChangePassword';

interface ChangePasswordModalProps {
  onClose: () => void;
}

const MIN_LENGTH = 8;

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    next === confirm &&
    !changePassword.isPending;

  const fail = (message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  };

  const handleSubmit = (requestClose: () => void) => async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      setDone(true);
      setTimeout(requestClose, 1000);
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      fail(status === 401 ? 'Current password is incorrect.' : 'Could not change password.');
    }
  };

  const inputCls =
    'w-full h-11 pl-4 pr-11 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/25 transition-colors';

  return (
    <Modal onClose={onClose}>
      {(requestClose) => (
        <form
          key={shakeKey}
          onSubmit={handleSubmit(requestClose)}
          className={`w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a1a1a] shadow-2xl p-7 ${
            error ? 'animate-shake' : ''
          }`}
        >
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <X size={16} />
          </button>
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Lock size={26} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Change password</h2>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              Other active sessions will be signed out after you change it.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                autoFocus
                type={show ? 'text' : 'password'}
                maxLength={256}
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  setError(null);
                }}
                placeholder="Current password"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <input
              type={show ? 'text' : 'password'}
              maxLength={256}
              value={next}
              onChange={(e) => {
                setNext(e.target.value);
                setError(null);
              }}
              placeholder="New password"
              className={inputCls}
            />
            <input
              type={show ? 'text' : 'password'}
              maxLength={256}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="Confirm new password"
              className={inputCls}
            />
          </div>

          {tooShort && (
            <p className="text-xs text-gray-500 mt-3">Use at least {MIN_LENGTH} characters.</p>
          )}
          {mismatch && <p className="text-xs text-amber-400 mt-3">Passwords do not match.</p>}
          {error && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || done}
            className="w-full h-11 mt-5 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {changePassword.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : done ? (
              <>
                <Check size={16} /> Password changed
              </>
            ) : (
              'Change password'
            )}
          </button>
        </form>
      )}
    </Modal>
  );
}
