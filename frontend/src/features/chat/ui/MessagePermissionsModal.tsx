import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

interface MessagePermissionsModalProps {
  onClose: () => void;
}

export default function MessagePermissionsModal({ onClose }: MessagePermissionsModalProps) {
  const [permissions, setPermissions] = useState({
    sendText: true,
    sendMedia: true,
    sendVoice: true,
    sendPolls: true,
    addReactions: true,
  });

  const toggle = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Permissions Updated',
      body: 'Message permissions have been successfully saved.',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    onClose();
  };

  const items: { key: keyof typeof permissions; label: string; desc: string }[] = [
    { key: 'sendText', label: 'Send text messages', desc: 'Allow sending standard text' },
    { key: 'sendMedia', label: 'Send media & files', desc: 'Allow sending photos, videos & files' },
    { key: 'sendVoice', label: 'Send voice messages', desc: 'Allow recording audio clips' },
    { key: 'sendPolls', label: 'Create polls', desc: 'Allow creating interactive polls' },
    { key: 'addReactions', label: 'Add emoji reactions', desc: 'Allow reacting to messages' },
  ];

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#181a22] border border-white/10 rounded-3xl w-full shadow-2xl overflow-hidden backdrop-blur-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Message Permissions</h3>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-5">
            {items.map((item) => (
              <div
                key={item.key}
                onClick={() => toggle(item.key)}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer select-none"
              >
                <div>
                  <p className="text-xs font-semibold text-gray-200">{item.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                    permissions[item.key]
                      ? 'bg-purple-500 justify-end'
                      : 'bg-white/20 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-95"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
