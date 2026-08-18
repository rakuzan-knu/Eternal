import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  UserRound,
  Bell,
  BellOff,
  Search,
  ChevronRight,
  Palette,
  Pencil,
  Archive,
  Trash2,
  Users,
  LogOut,
} from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { ConversationView, MessageView, MuteLevel } from '../../../entities/chat/model/types';
import { ConversationDisplay } from '../lib/getConversationDisplay';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import NicknamesModal from './NicknamesModal';
import PinnedMessagesModal from './PinnedMessagesModal';
import MuteOptionsModal from './MuteOptionsModal';
import MediaFilesLinksModal from './MediaFilesLinksModal';
import EditGroupModal from './EditGroupModal';
import GroupParticipantsModal from './GroupParticipantsModal';
import AddMembersModal from './AddMembersModal';
import GroupMemberDetailView from './GroupMemberDetailView';
import GroupMembersSection from './details/GroupMembersSection';
import ChatInfoSection from './details/ChatInfoSection';
import PrivacySupportSection from './details/PrivacySupportSection';
import { SectionButton } from './details/SectionButton';
import SelectThemeModal from './SelectThemeModal';
import MessagePermissionsModal from './MessagePermissionsModal';
import RestrictUserModal from './RestrictUserModal';
import ReportConversationModal from './ReportConversationModal';
import DeleteChatModal from './DeleteChatModal';
import { useMessageActions } from '../model/useMessageActions';
import {
  useArchiveConversation,
  useBlockUser,
  useMuteConversation,
  useLeaveConversation,
  useDeleteConversation,
} from '../model/useConversationMutations';

interface ConversationDetailsPanelProps {
  conversation: ConversationView;
  display: ConversationDisplay;
  otherUserId: string | null;
  messages: MessageView[];
  onClose: () => void;
  onOpenSearch: () => void;
  onJumpToMessage: (messageId: string) => void;
}

type DetailsModal =
  | 'nicknames'
  | 'pinned'
  | 'mute'
  | 'editGroup'
  | 'participants'
  | 'admins'
  | 'addMembers'
  | 'theme'
  | 'permissions'
  | 'restrict'
  | 'report'
  | 'delete';

export default function ConversationDetailsPanel({
  conversation,
  display,
  otherUserId,
  messages,
  onClose,
  onOpenSearch,
  onJumpToMessage,
}: ConversationDetailsPanelProps) {
  const navigate = useNavigate();
  const { userId: currentUserId } = useAuthStore();
  const isGroup = conversation.type === 'GROUP';

  const isOnline = usePresenceStore((s) =>
    otherUserId ? s.onlineUserIds.has(otherUserId) : false,
  );
  const muteConversation = useMuteConversation();
  const archiveConversation = useArchiveConversation();
  const blockUser = useBlockUser();
  const leaveConversation = useLeaveConversation();
  const deleteConversation = useDeleteConversation();
  const messageActions = useMessageActions(conversation.id);

  const [isInfoOpen, setInfoOpen] = useState(true);
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<DetailsModal | null>(null);
  const [viewedMemberId, setViewedMemberId] = useState<string | null>(null);
  const [galleryTab, setGalleryTab] = useState<'media' | 'files' | 'links' | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 180);
  };

  const otherUsername = conversation.participants.find((p) => p.userId === otherUserId)?.user
    .username;
  const myParticipant = conversation.participants.find((p) => p.userId === currentUserId);

  const isMuted = conversation.myMuteLevel !== 'NONE';
  const pinnedCount = conversation.pinnedMessages.length;

  const { mediaCount, fileCount, linkCount } = useMemo(() => {
    let media = 0;
    let files = 0;
    let links = 0;
    for (const m of messages) {
      for (const a of m.attachments) {
        if (a.type === 'IMAGE' || a.type === 'VIDEO' || a.type === 'GIF') media += 1;
        else if (a.type === 'FILE' || a.type === 'AUDIO') files += 1;
        else if (a.type === 'LINK') links += 1;
      }
    }
    return { mediaCount: media, fileCount: files, linkCount: links };
  }, [messages]);

  const handleToggleMute = () => {
    if (isMuted) {
      muteConversation.mutate({ conversationId: conversation.id, muteLevel: 'NONE' });
    } else {
      setActiveModal('mute');
    }
  };

  const handleConfirmMute = (muteLevel: MuteLevel) => {
    muteConversation.mutate({ conversationId: conversation.id, muteLevel });
    setActiveModal(null);
  };

  const handleLeaveGroup = () => {
    if (!window.confirm('Leave this group?')) return;
    leaveConversation.mutate(conversation.id, {
      onSuccess: () => {
        navigate('/messages');
        requestClose();
      },
    });
  };

  const handleDeleteChat = (forAll: boolean) => {
    deleteConversation.mutate(
      { conversationId: conversation.id, forAll },
      {
        onSuccess: () => {
          navigate('/messages');
          requestClose();
        },
      },
    );
    setActiveModal(null);
  };

  const viewedParticipant = conversation.participants.find((p) => p.userId === viewedMemberId);
  const canManageMembers = myParticipant?.role === 'OWNER';

  if (viewedParticipant) {
    return (
      <div
        className={`h-full w-[340px] flex-shrink-0 flex flex-col bg-[#16161a]/80 backdrop-blur-2xl border-l border-white/5 ${
          isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'
        }`}
      >
        <GroupMemberDetailView
          conversation={conversation}
          participant={viewedParticipant}
          canManage={canManageMembers}
          onBack={() => setViewedMemberId(null)}
        />
      </div>
    );
  }

  return (
    <div
      className={`h-full w-[340px] flex-shrink-0 flex flex-col bg-[#16161a]/80 backdrop-blur-2xl border-l border-white/5 ${
        isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'
      }`}
    >
      <div className="flex items-center justify-between px-5 h-16 flex-shrink-0 border-b border-white/5">
        <h2 className="text-base font-bold text-white">Chat details</h2>
        <button
          onClick={requestClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative mb-3">
            {isGroup ? (
              <GroupAvatarCollage
                avatars={conversation.participants.map((p) => p.user.avatar)}
                size={80}
              />
            ) : (
              <>
                <Avatar size="xl" src={display.avatar} />
                {otherUserId && (
                  <OnlineStatusIndicator userId={otherUserId} variant="dot" size="md" />
                )}
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 min-w-0">
            <p className="text-lg font-bold text-white truncate">{display.title}</p>
            {display.isVerified && <VerifiedCheckmark size="md" />}
          </div>
          {isGroup ? (
            <p className="text-sm mt-0.5 text-gray-500">
              {conversation.participants.length} members
            </p>
          ) : (
            <p
              className={`inline-flex items-center gap-1.5 text-sm mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-gray-500'}`}
            >
              {isOnline && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              {isOnline ? 'Active now' : 'Offline'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-5">
          {!isGroup && otherUserId && otherUsername && (
            <a
              href={`/${otherUsername}`}
              className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-300 hover:bg-white/5 transition-colors"
            >
              <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10">
                <UserRound size={17} />
              </span>
              <span className="text-[11px] font-medium">Profile</span>
            </a>
          )}
          {isGroup && (
            <button
              onClick={() => setActiveModal('participants')}
              className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-300 hover:bg-white/5 transition-colors"
            >
              <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10">
                <Users size={17} />
              </span>
              <span className="text-[11px] font-medium">Members</span>
            </button>
          )}
          <button
            onClick={handleToggleMute}
            className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-300 hover:bg-white/5 transition-colors"
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10">
              {isMuted ? <BellOff size={17} /> : <Bell size={17} />}
            </span>
            <span className="text-[11px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            onClick={onOpenSearch}
            className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-300 hover:bg-white/5 transition-colors"
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10">
              <Search size={17} />
            </span>
            <span className="text-[11px] font-medium">Search</span>
          </button>
        </div>

        {isGroup && (
          <GroupMembersSection
            conversation={conversation}
            onAddMembers={() => setActiveModal('addMembers')}
            onSelectMember={(userId) => setViewedMemberId(userId)}
            onViewAll={() => setActiveModal('participants')}
          />
        )}

        <div className="h-px bg-white/5 my-2" />

        <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Chat settings
        </p>

        <ChatInfoSection
          isOpen={isInfoOpen}
          onToggle={() => setInfoOpen((v) => !v)}
          pinnedCount={pinnedCount}
          mediaCount={mediaCount}
          fileCount={fileCount}
          linkCount={linkCount}
          onOpenPinned={() => setActiveModal('pinned')}
          onOpenGallery={(tab) => setGalleryTab(tab)}
        />

        <button
          onClick={() => setActiveModal('theme')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-3 text-sm font-medium">
            <Palette size={17} className="text-purple-400" /> Change theme
          </span>
          <ChevronRight size={16} className="text-gray-500" />
        </button>

        {isGroup ? (
          <button
            onClick={() => setActiveModal('editGroup')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3 text-sm font-medium">
              <Pencil size={17} className="text-gray-400" /> Edit group
            </span>
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        ) : (
          <button
            onClick={() => setActiveModal('nicknames')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3 text-sm font-medium">
              <Pencil size={17} className="text-gray-400" /> Edit nickname
            </span>
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        )}

        <div className="h-px bg-white/5 my-2" />

        <p className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Privacy &amp; support
        </p>

        <PrivacySupportSection
          isOpen={isPrivacyOpen}
          onToggle={() => setPrivacyOpen((v) => !v)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isGroup={isGroup}
          otherUserId={otherUserId}
          onOpenPermissions={() => setActiveModal('permissions')}
          onOpenRestrict={() => setActiveModal('restrict')}
          onBlock={(userId) => blockUser.mutate(userId)}
          onOpenReport={() => setActiveModal('report')}
        />

        <div className="h-px bg-white/5 my-2" />

        {isGroup ? (
          <SectionButton
            icon={<LogOut size={17} />}
            label="Leave group"
            danger
            onClick={handleLeaveGroup}
          />
        ) : (
          <>
            <SectionButton
              icon={<Archive size={17} />}
              label={conversation.isArchived ? 'Unarchive chat' : 'Archive chat'}
              danger
              onClick={() =>
                archiveConversation.mutate({
                  conversationId: conversation.id,
                  archived: !conversation.isArchived,
                })
              }
            />
            <SectionButton
              icon={<Trash2 size={17} />}
              label="Delete chat"
              danger
              onClick={() => setActiveModal('delete')}
            />
          </>
        )}
      </div>

      {activeModal === 'nicknames' && (
        <NicknamesModal conversation={conversation} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'pinned' && (
        <PinnedMessagesModal
          pinnedMessages={conversation.pinnedMessages}
          onClose={() => setActiveModal(null)}
          onJumpToMessage={(messageId) => {
            setActiveModal(null);
            onJumpToMessage(messageId);
          }}
          onUnpin={(messageId) => messageActions.unpinMessage(messageId).catch(() => {})}
        />
      )}

      {activeModal === 'mute' && (
        <MuteOptionsModal onClose={() => setActiveModal(null)} onConfirm={handleConfirmMute} />
      )}

      {galleryTab && (
        <MediaFilesLinksModal
          messages={messages}
          initialTab={galleryTab}
          onClose={() => setGalleryTab(null)}
          onJumpToMessage={onJumpToMessage}
        />
      )}

      {activeModal === 'editGroup' && (
        <EditGroupModal
          conversation={conversation}
          onClose={() => setActiveModal(null)}
          onOpenParticipants={() => setActiveModal('participants')}
          onOpenAdmins={() => setActiveModal('admins')}
        />
      )}

      {(activeModal === 'participants' || activeModal === 'admins') && (
        <GroupParticipantsModal
          conversation={conversation}
          currentUserId={currentUserId}
          roleFilter={activeModal === 'admins' ? 'ADMINS' : 'ALL'}
          onClose={() => setActiveModal(null)}
          onSelectMember={(userId) => setViewedMemberId(userId)}
        />
      )}

      {activeModal === 'addMembers' && (
        <AddMembersModal
          conversationId={conversation.id}
          existingMemberIds={conversation.participants.map((p) => p.userId)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'theme' && (
        <SelectThemeModal
          conversationId={conversation.id}
          currentTheme={conversation.myTheme}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'permissions' && (
        <MessagePermissionsModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'restrict' && otherUserId && (
        <RestrictUserModal userId={otherUserId} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'report' && otherUserId && (
        <ReportConversationModal
          userId={otherUserId}
          conversationId={conversation.id}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'delete' && (
        <DeleteChatModal
          onClose={() => setActiveModal(null)}
          onConfirm={handleDeleteChat}
          conversationName={display.title}
          avatarUrl={display.avatar}
          isGroup={isGroup}
          otherUserName={display.title}
        />
      )}
    </div>
  );
}
