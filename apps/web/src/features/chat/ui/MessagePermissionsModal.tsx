import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import {
  Permission,
  DEFAULT_MEMBER_PERMISSIONS,
  togglePermission as bitwiseToggle,
} from '@/shared/lib/permissions';

interface MessagePermissionsModalProps {
  onClose: () => void;
  initialMask?: number;
}

export default function MessagePermissionsModal({
  onClose,
  initialMask = DEFAULT_MEMBER_PERMISSIONS,
}: MessagePermissionsModalProps) {
  const [permissionsMask, setPermissionsMask] = useState<number>(initialMask);

  const toggle = (flag: Permission) => {
    setPermissionsMask((prev) => bitwiseToggle(prev, flag));
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

  const items: { flag: Permission; label: string; desc: string }[] = [
    {
      flag: Permission.CAN_SEND_TEXT,
      label: 'Send text messages',
      desc: 'Allow sending standard text',
    },
    {
      flag: Permission.CAN_SEND_MEDIA,
      label: 'Send media & files',
      desc: 'Allow sending photos, videos & files',
    },
    {
      flag: Permission.CAN_SEND_VOICE,
      label: 'Send voice messages',
      desc: 'Allow recording audio clips',
    },
    {
      flag: Permission.CAN_SEND_POLLS,
      label: 'Create polls',
      desc: 'Allow creating interactive polls',
    },
    {
      flag: Permission.CAN_ADD_REACTIONS,
      label: 'Add emoji reactions',
      desc: 'Allow reacting to messages',
    },
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
            {items.map((item) => {
              const isChecked = (permissionsMask & item.flag) !== 0;
              return (
                <div
                  key={item.flag}
                  onClick={() => toggle(item.flag)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer select-none"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-200">{item.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                      isChecked ? 'bg-purple-500 justify-end' : 'bg-white/20 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </div>
                </div>
              );
            })}
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
              className="px-5 py-2 rounded-full text-sm font-semibold bg-linear-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-95"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
