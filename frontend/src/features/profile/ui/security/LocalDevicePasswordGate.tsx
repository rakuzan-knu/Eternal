import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useDevicePasswordStore } from '../../model/useDevicePasswordStore';
import DevicePasswordSetupModal from './DevicePasswordSetupModal';

export default function LocalDevicePasswordGate() {
  const stored = useDevicePasswordStore((s) => s.stored);
  const disable = useDevicePasswordStore((s) => s.disable);
  const [setupOpen, setSetupOpen] = useState(false);
  const enabled = stored !== null;

  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-200">
          <Lock size={17} />
        </span>
        <div>
          <h4 className="font-medium text-gray-200">Device passcode</h4>
          <p className="text-sm text-gray-500">
            {enabled ? 'Required to open the app on this device.' : 'Lock the app on this device.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {enabled && (
          <button
            type="button"
            onClick={disable}
            className="px-4 py-2 rounded-full text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/15 transition"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={() => setSetupOpen(true)}
          className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-full font-bold text-xs transition"
        >
          {enabled ? 'Change' : 'Enable'}
        </button>
      </div>

      {setupOpen && <DevicePasswordSetupModal onClose={() => setSetupOpen(false)} />}
    </div>
  );
}
