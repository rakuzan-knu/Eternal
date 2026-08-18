import React, { useState } from 'react';
import { X, Crown, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import Modal from '../../../shared/ui/Modal';
import { ConversationView, ConversationParticipantView } from '../../../entities/chat/model/types';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import AdminPermissionsModal from './AdminPermissionsModal';

interface GroupParticipantsModalProps {
  conversation: ConversationView;
  currentUserId: string | null;
  onClose: () => void;
  onSelectMember: (userId: string) => void;
  roleFilter?: 'ADMINS' | 'ALL';
}

export default function GroupParticipantsModal({
  conversation,
  currentUserId,
  onClose,
  onSelectMember,
  roleFilter = 'ALL',
}: GroupParticipantsModalProps) {
  const [selectedAdminForPermissions, setSelectedAdminForPermissions] =
    useState<ConversationParticipantView | null>(null);

  const currentUserParticipant = conversation.participants.find((p) => p.userId === currentUserId);
  const isOwner = currentUserParticipant?.role === 'OWNER';

  const filteredParticipants =
    roleFilter === 'ADMINS'
      ? conversation.participants.filter((p) => p.role === 'OWNER' || p.role === 'ADMIN')
      : conversation.participants;

  return (
    <>
      <Modal onClose={onClose} className="w-full max-w-sm max-h-[70vh] flex flex-col">
        {(close) => (
          <div className="bg-[#181926]/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[70vh] backdrop-blur-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">
                {roleFilter === 'ADMINS'
                  ? `${filteredParticipants.length} admins`
                  : `${filteredParticipants.length} participants`}
              </h2>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
              {filteredParticipants.map((p, index) => {
                const name = p.nickname ?? p.user.displayName ?? p.user.username;
                const isSelf = p.userId === currentUserId;

                return (
                  <div
                    key={p.userId}
                    style={{ animationDelay: `${Math.min(index, 8) * 20}ms` }}
                    className="animate-fadeIn w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onSelectMember(p.userId);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="relative">
                        <Avatar size="sm" src={p.user.avatar} />
                        <OnlineStatusIndicator userId={p.userId} variant="dot" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{name}</p>
                          {p.user.isVerified && <VerifiedCheckmark size="sm" />}
                          {isSelf && (
                            <span className="text-gray-500 font-normal shrink-0"> (you)</span>
                          )}
                        </div>
                        {(p.role === 'OWNER' || p.role === 'ADMIN') && (
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            {p.role === 'OWNER' ? (
                              <Crown size={11} className="text-yellow-500" />
                            ) : (
                              <ShieldCheck size={11} className="text-blue-400" />
                            )}
                            {p.role === 'OWNER' ? 'Owner' : 'Admin'}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Owner can manage Admin Permissions */}
                    {isOwner && p.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdminForPermissions(p);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 border border-white/5 hover:border-purple-500/30 transition-all active:scale-90"
                        title="Configure Admin Permissions"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Permissions Modal */}
      {selectedAdminForPermissions && (
        <AdminPermissionsModal
          isOpen={Boolean(selectedAdminForPermissions)}
          onClose={() => setSelectedAdminForPermissions(null)}
          conversationId={conversation.id}
          adminParticipant={selectedAdminForPermissions}
        />
      )}
    </>
  );
}
