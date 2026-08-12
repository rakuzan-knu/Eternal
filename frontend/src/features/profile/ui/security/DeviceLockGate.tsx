import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useDevicePasswordStore } from '../../model/useDevicePasswordStore';

export default function DeviceLockGate({ children }: { children: React.ReactNode }) {
  const stored = useDevicePasswordStore((s) => s.stored);
  const unlocked = useDevicePasswordStore((s) => s.unlocked);
  const verify = useDevicePasswordStore((s) => s.verify);

  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const locked = stored !== null && !unlocked;
  if (!locked) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setBusy(true);
    try {
      const ok = await verify(value);
      if (!ok) {
        setError(true);
        setShakeKey((k) => k + 1);
        setValue('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#0b0b0c] p-6">
      <form
        key={shakeKey}
        onSubmit={submit}
        className={`w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl p-7 animate-modalPop ${
          error ? 'animate-shake' : ''
        }`}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Lock size={26} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">App locked</h2>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Enter your device passcode to continue.
          </p>
        </div>

        <div className="relative">
          <input
            autoFocus
            type={show ? 'text' : 'password'}
            maxLength={256}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            placeholder="Passcode"
            className="w-full h-11 pl-4 pr-11 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/25 transition-colors"
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

        {error && <p className="text-xs text-red-400 mt-3 text-center">Incorrect passcode.</p>}

        <button
          type="submit"
          disabled={busy || value.length === 0}
          className="w-full h-11 mt-5 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-40"
        >
          Unlock
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600 mt-5">
          <ShieldCheck size={13} />
          Stored only on this device
        </p>
      </form>
    </div>
  );
}
