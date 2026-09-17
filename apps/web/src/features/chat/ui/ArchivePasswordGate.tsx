import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { useArchivePasswordStore } from '../model/useArchivePasswordStore';

interface ArchivePasswordGateProps {
  onUnlock: () => void;
}

const MIN_LENGTH = 4;

export default function ArchivePasswordGate({ onUnlock }: ArchivePasswordGateProps) {
  const { passwordHash, setPassword, verify, resetPassword } = useArchivePasswordStore();
  const isCreating = passwordHash === null;

  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fail = (message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCreating) {
      if (password.length < MIN_LENGTH) {
        fail(`Use at least ${MIN_LENGTH} characters.`);
        return;
      }
      if (password !== confirm) {
        fail('Passwords do not match.');
        return;
      }
      setBusy(true);
      try {
        await setPassword(password);
        onUnlock();
      } catch {
        fail('Could not set the password on this device.');
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      if (await verify(password)) {
        onUnlock();
      } else {
        fail('Incorrect password. Try again.');
      }
    } catch {
      fail('Could not verify the password on this device.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    resetPassword();
    setPasswordValue('');
    setConfirm('');
    setError(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form
        key={shakeKey}
        onSubmit={handleSubmit}
        className={`w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl p-7 animate-modalPop ${
          error ? 'animate-shake' : ''
        }`}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Lock size={26} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {isCreating ? 'Protect your archive' : 'Archive locked'}
          </h2>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            {isCreating
              ? 'Set a password to keep your archived chats private on this device.'
              : 'Enter your password to view your archived chats.'}
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              autoFocus
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPasswordValue(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              className="w-full h-11 pl-4 pr-11 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/25 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {isCreating && (
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="Confirm password"
              className="w-full h-11 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/25 transition-colors"
            />
          )}
        </div>

        {error && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 mt-5 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isCreating ? (
            'Set password & unlock'
          ) : (
            'Unlock'
          )}
        </button>

        {!isCreating && (
          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            Forgot password? Reset it
          </button>
        )}

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600 mt-5">
          <ShieldCheck size={13} />
          Stored only on this device
        </p>
      </form>
    </div>
  );
}
