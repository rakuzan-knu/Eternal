import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import { useDevicePasswordStore } from '../../model/useDevicePasswordStore';

interface SetupModalProps {
  onClose: () => void;
}

export default function DevicePasswordSetupModal({ onClose }: SetupModalProps) {
  const setPassword = useDevicePasswordStore((s) => s.setPassword);
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fail = (message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  };

  const submit = (requestClose: () => void) => async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.trim().length === 0) return fail('Passcode cannot be empty.');
    if (password.length > 256) return fail('Passcode cannot exceed 256 characters.');
    if (password !== confirm) return fail('Passcodes do not match.');
    setBusy(true);
    try {
      await setPassword(password);
      requestClose();
    } catch {
      fail('Could not set the password on this device.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full h-11 pl-4 pr-11 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/25 transition-colors';

  return (
    <Modal onClose={onClose}>
      {(requestClose) => (
        <form
          key={shakeKey}
          onSubmit={submit(requestClose)}
          className={`w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a1a1a] shadow-2xl p-7 ${
            error ? 'animate-shake' : ''
          }`}
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Lock size={26} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Device passcode</h2>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              Require a passcode to open the app on this device. Stored only here, secured with Web
              Crypto.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                autoFocus
                type={show ? 'text' : 'password'}
                maxLength={256}
                value={password}
                onChange={(e) => {
                  setPasswordValue(e.target.value);
                  setError(null);
                }}
                placeholder="Passcode"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide' : 'Show'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input
              type={show ? 'text' : 'password'}
              maxLength={256}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="Confirm passcode"
              className={inputCls}
            />
          </div>

          {error && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 mt-5 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Set passcode'}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600 mt-5">
            <ShieldCheck size={13} />
            Stored only on this device
          </p>
        </form>
      )}
    </Modal>
  );
}
