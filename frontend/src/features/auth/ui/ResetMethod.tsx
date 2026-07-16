import React, { useState } from 'react';
import Avatar from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { FoundUserResponse } from '../model/types';

interface ResetMethodProps {
  user: FoundUserResponse;
  onCancel: () => void;
}

export const ResetMethod: React.FC<ResetMethodProps> = ({ user, onCancel }) => {
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'sms'>('email');
  const [isSending, setIsSending] = useState(false);

  const handleSendCode = async () => {
    setIsSending(true);
    alert(
      `Code sent to selected channel: ${selectedMethod === 'email' ? user.maskedEmail : user.maskedPhone}`,
    );
    setIsSending(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 p-3 bg-neutral-900/30 border border-neutral-800/40 rounded-xl">
        <div className="rounded-full border border-purple-500/20 p-[2px]">
          <Avatar src={user.src} size="md" />
        </div>

        <div className="flex flex-col text-left">
          <span className="text-sm font-bold text-white tracking-wide">{user.name}</span>
          <span className="text-xs text-neutral-500 font-medium">{user.role}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center justify-between p-3.5 bg-[#121214]/40 border border-neutral-800/60 rounded-xl cursor-pointer hover:bg-neutral-800/20 transition-all select-none">
          <span className="text-sm font-medium text-neutral-300">
            Send code to Email ({user.maskedEmail})
          </span>
          <input
            type="radio"
            name="reset-option"
            checked={selectedMethod === 'email'}
            onChange={() => setSelectedMethod('email')}
            className="w-4 h-4 accent-purple-500 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-3.5 bg-[#121214]/40 border border-neutral-800/60 rounded-xl cursor-pointer hover:bg-neutral-800/20 transition-all select-none">
          <span className="text-sm font-medium text-neutral-300">
            Send code via SMS ({user.maskedPhone})
          </span>
          <input
            type="radio"
            name="reset-option"
            checked={selectedMethod === 'sms'}
            onChange={() => setSelectedMethod('sms')}
            className="w-4 h-4 accent-purple-500 cursor-pointer"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <Button onClick={handleSendCode} disabled={isSending}>
          {isSending ? 'Sending...' : 'Continue'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={isSending}>
          Isn't that you?
        </Button>
      </div>
    </div>
  );
};
