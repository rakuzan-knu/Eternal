import React, { useState } from 'react';
import { ShieldCheck, Edit, Trash2, UserX, Pin, UserPlus, Loader2, Check, X } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import Avatar from '@/shared/ui/Avatar';
import { ConversationParticipantView } from '@/entities/chat/model/types';
import {
  Permission,
  DEFAULT_ADMIN_PERMISSIONS,
  adminPermissionsToMask,
  maskToAdminPermissions,
  togglePermission as bitwiseToggle,
} from '@/shared/lib/permissions';
import { chatApi } from '../api/chatApi';

export interface AdminPermissions {
  canEditGroup: boolean;
  canDeleteMessages: boolean;
  canManageMembers: boolean;
  canPinMessages: boolean;
  canInviteUsers: boolean;
}

interface AdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  adminParticipant: ConversationParticipantView;
  initialPermissions?: Partial<AdminPermissions>;
  initialMask?: number;
  onSuccess?: () => void;
}

export default function AdminPermissionsModal({
  isOpen,
  onClose,
  conversationId,
  adminParticipant,
  initialPermissions,
  initialMask,
  onSuccess,
}: AdminPermissionsModalProps) {
  const [permissionsMask, setPermissionsMask] = useState<number>(() => {
    if (initialMask !== undefined) return initialMask;
    if (adminParticipant.permissions !== undefined && adminParticipant.permissions !== 0) {
      return adminParticipant.permissions;
    }
    if (initialPermissions) {
      return adminPermissionsToMask(initialPermissions);
    }
    return DEFAULT_ADMIN_PERMISSIONS;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleBit = (flag: Permission) => {
    setPermissionsMask((prev) => bitwiseToggle(prev, flag));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const permsObject = maskToAdminPermissions(permissionsMask);
      await chatApi.updateAdminPermissions(conversationId, adminParticipant.userId, {
        permissions: permissionsMask,
        ...permsObject,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save admin permissions';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const name =
    adminParticipant.nickname ||
    adminParticipant.user.displayName ||
    adminParticipant.user.username;

  const PERMISSION_ITEMS: Array<{
    key: keyof AdminPermissions;
    flag: Permission;
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    {
      key: 'canEditGroup',
      flag: Permission.CAN_EDIT,
      label: 'Edit group profile',
      description: 'Change name, avatar, description, and group settings',
      icon: Edit,
    },
    {
      key: 'canDeleteMessages',
      flag: Permission.CAN_DELETE,
      label: "Delete other people's messages",
      description: 'Delete messages posted by any regular group member',
      icon: Trash2,
    },
    {
      key: 'canManageMembers',
      flag: Permission.CAN_MANAGE_MEMBERS,
      label: 'Block/mute members',
      description: 'Mute, ban, or kick regular participants who violate rules',
      icon: UserX,
    },
    {
      key: 'canPinMessages',
      flag: Permission.CAN_PIN_MESSAGES,
      label: 'Pin messages',
      description: 'Pin or unpin important group notices and announcements',
      icon: Pin,
    },
    {
      key: 'canInviteUsers',
      flag: Permission.CAN_INVITE_USERS,
      label: 'Invite members',
      description: 'Generate group invite links and add new members',
      icon: UserPlus,
    },
  ];

  return (
    <Modal onClose={onClose} className="w-full max-w-md">
      {(close) => (
        <div className="bg-[#181926]/95 border border-white/10 rounded-3xl shadow-2xl p-5 flex flex-col gap-4 backdrop-blur-2xl text-white select-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-lg font-bold text-white tracking-tight">Admin Permissions</h3>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {/* Admin Member Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/4 border border-white/10 backdrop-blur-md">
            <div className="relative">
              <Avatar
                src={adminParticipant.user.avatar}
                name={name}
                size="md"
                className="rounded-full"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 border-2 border-[#12131e] flex items-center justify-center text-white shadow-sm">
                <ShieldCheck size={11} />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{name}</h4>
              <p className="text-xs text-purple-400 font-medium">Administrator</p>
            </div>
          </div>

          {error && (
            <div className="px-3.5 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="text-xs text-gray-400 font-medium leading-relaxed">
            What can this administrator do in this group?
          </div>

          {/* Permission Toggle Matrix */}
          <div className="flex flex-col gap-2">
            {PERMISSION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isChecked = (permissionsMask & item.flag) !== 0;
              return (
                <div
                  key={item.key}
                  onClick={() => toggleBit(item.flag)}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#151622]/80 hover:bg-[#181928] border border-white/10 hover:border-purple-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                        isChecked
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                          : 'bg-white/5 text-gray-400 border border-white/5'
                      }`}
                    >
                      <Icon size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white group-hover:text-purple-200 transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-gray-400 leading-snug">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {/* Custom Toggle Switch */}
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
                      isChecked
                        ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                        : 'bg-white/15'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        isChecked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className="px-5 py-2 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-semibold text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-22.5"
            >
              {isSaving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : saveSuccess ? (
                <span className="flex items-center gap-1">
                  <Check size={15} /> Saved
                </span>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
