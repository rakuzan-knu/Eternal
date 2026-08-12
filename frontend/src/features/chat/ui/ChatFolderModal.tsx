import React, { useMemo, useState } from 'react';
import { Check, Minus, Plus, Search, X } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import { AddEmojiButton } from '../../../shared/ui/AddEmojiButton';
import { ConversationView } from '../../../entities/chat/model/types';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { folderIconOptions } from '../lib/chatFolderIcons';
import { ChatFolder } from '../model/useChatFoldersStore';
import ChatFolderIcon from './ChatFolderIcon';
import FolderRow from './FolderRow';

interface ChatFolderModalProps {
  folder?: ChatFolder | null;
  conversations: ConversationView[];
  currentUserId: string | null;
  onClose: () => void;
  onSave: (folder: Omit<ChatFolder, 'id' | 'isSystem'>) => void;
}

const colors = ['#ef4444', '#f97316', '#8b5cf6', '#22c55e', '#38bdf8', '#60a5fa', '#e05275'];

type SelectionMode = 'include' | 'exclude' | null;
type ChatTypeFilter = 'all' | 'direct' | 'group';

export default function ChatFolderModal({
  folder,
  conversations,
  currentUserId,
  onClose,
  onSave,
}: ChatFolderModalProps) {
  const [name, setName] = useState(folder?.name ?? '');
  const [icon, setIcon] = useState<string | null>(folder?.icon ?? 'folder');
  const [emoji, setEmoji] = useState<string | null>(folder?.emoji ?? null);
  const [color, setColor] = useState(folder?.color ?? colors[5]);
  const [includeIds, setIncludeIds] = useState<string[]>(folder?.includeIds ?? []);
  const [excludeIds, setExcludeIds] = useState<string[]>(folder?.excludeIds ?? []);
  const [isIconPickerOpen, setIconPickerOpen] = useState(false);
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChatTypeFilter>('all');
  const [didTrySubmit, setDidTrySubmit] = useState(false);

  const trimmedName = name.trim();
  const isEditing = Boolean(folder);
  const title = isEditing ? 'Edit folder' : 'New folder';

  const selectableConversations = useMemo(() => {
    const lower = query.toLowerCase();
    return conversations
      .filter((conversation) => !conversation.isArchived)
      .filter((conversation) => {
        if (typeFilter === 'direct') return conversation.type === 'DIRECT';
        if (typeFilter === 'group') return conversation.type === 'GROUP';
        return true;
      })
      .filter((conversation) =>
        getConversationDisplay(conversation, currentUserId).title.toLowerCase().includes(lower),
      );
  }, [conversations, currentUserId, query, typeFilter]);

  const toggleConversation = (conversationId: string) => {
    if (selectionMode === 'include') {
      setIncludeIds((prev) =>
        prev.includes(conversationId)
          ? prev.filter((id) => id !== conversationId)
          : [...prev, conversationId],
      );
      setExcludeIds((prev) => prev.filter((id) => id !== conversationId));
    }

    if (selectionMode === 'exclude') {
      setExcludeIds((prev) =>
        prev.includes(conversationId)
          ? prev.filter((id) => id !== conversationId)
          : [...prev, conversationId],
      );
      setIncludeIds((prev) => prev.filter((id) => id !== conversationId));
    }
  };

  const selectedIds = selectionMode === 'exclude' ? excludeIds : includeIds;

  const handleSave = () => {
    setDidTrySubmit(true);
    if (!trimmedName) return;
    onSave({ name: trimmedName, icon, emoji, color, includeIds, excludeIds });
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-[520px] max-h-[88vh] flex flex-col">
      {(close) => (
        <div className="max-h-[88vh] overflow-hidden rounded-[28px] border border-white/10 bg-[#1f1f23]/90 text-white shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl backdrop-saturate-150">
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={close}
              className="h-9 w-9 rounded-full bg-white/[0.04] text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X size={17} className="mx-auto" />
            </button>
          </div>

          <div className="max-h-[calc(88vh-80px)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 px-6 pb-5">
              <button
                type="button"
                onClick={() => setIconPickerOpen((v) => !v)}
                className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-white/5 transition-colors hover:bg-white/10"
              >
                <ChatFolderIcon iconKey={icon} emoji={emoji} color={color} size={25} />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-[#60a5fa] p-1">
                  <Plus size={12} />
                </span>
              </button>
              <div className="relative flex-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color }}>
                    Folder name
                  </label>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {Array.from(name).length}/12
                  </span>
                </div>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    if (Array.from(e.target.value).length <= 12) {
                      setName(e.target.value);
                    }
                  }}
                  className="mt-1 w-full border-b bg-transparent pb-2 pr-10 text-sm outline-none"
                  style={{ borderColor: color }}
                />
                <div className="absolute -bottom-1 -right-2">
                  <AddEmojiButton
                    isOpen={isEmojiPickerOpen}
                    onToggle={() => setEmojiPickerOpen((v) => !v)}
                    onEmojiSelect={(selectedEmoji) => {
                      if (Array.from(name + selectedEmoji).length <= 12) {
                        setName((prev) => prev + selectedEmoji);
                      }
                      setEmojiPickerOpen(false);
                    }}
                    forceDirection="bottom"
                    usePortal
                  />
                </div>
                {didTrySubmit && !trimmedName && (
                  <p className="mt-1 text-xs text-red-400">Folder name is required.</p>
                )}
              </div>
            </div>

            {isIconPickerOpen && (
              <div className="mx-6 mb-4 rounded-2xl border border-white/10 bg-[#151518]/90 p-4 shadow-xl backdrop-blur-2xl animate-menuIn">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-sky-300">Choose icon</p>
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close icon picker"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIcon(null);
                      setEmoji(null);
                      setIconPickerOpen(false);
                    }}
                    className="h-9 rounded-xl bg-white/[0.06] text-xs text-gray-400 hover:bg-white/10"
                  >
                    None
                  </button>
                  {folderIconOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setIcon(item.key);
                        setEmoji(null);
                        setIconPickerOpen(false);
                      }}
                      className={`flex h-9 items-center justify-center rounded-xl transition-colors ${
                        icon === item.key && !emoji
                          ? 'bg-white/15'
                          : 'bg-white/[0.06] hover:bg-white/10'
                      }`}
                    >
                      <ChatFolderIcon iconKey={item.key} color={color} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <FolderRow
              icon={<Plus size={17} />}
              title="Included chats"
              action={`${includeIds.length} selected`}
              onClick={() => setSelectionMode('include')}
              color={color}
            />
            <p className="bg-white/[0.035] px-6 py-3 text-sm text-gray-500">
              Chats and chat types shown in this folder.
            </p>

            <FolderRow
              icon={<Minus size={17} />}
              title="Excluded chats"
              action={`${excludeIds.length} selected`}
              onClick={() => setSelectionMode('exclude')}
              color={color}
            />
            <p className="bg-white/[0.035] px-6 py-3 text-sm text-gray-500">
              Chats that will not be shown in this folder.
            </p>

            <div className="px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold" style={{ color }}>
                  Folder color
                </p>
                <span className="text-sm text-gray-400">No label</span>
              </div>
              <div className="flex items-center gap-3">
                {colors.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setColor(item)}
                    className="h-9 w-9 rounded-full transition-transform hover:scale-105"
                    style={{
                      backgroundColor: item,
                      outline: color === item ? '3px solid rgba(255,255,255,0.35)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {selectionMode && (
              <div className="fixed inset-0 z-[360] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#1f1f23]/92 shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl backdrop-saturate-150 animate-modalPop">
                  <div className="flex items-center justify-between px-5 py-4">
                    <h3 className="font-bold">
                      {selectionMode === 'include' ? 'Include chats' : 'Exclude chats'}
                    </h3>
                    <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
                  </div>
                  <div className="px-5 pb-3">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search"
                        className="h-10 w-full rounded-full border border-white/5 bg-white/[0.06] pl-9 pr-4 text-sm outline-none transition-colors focus:border-white/15"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      {(['all', 'direct', 'group'] as ChatTypeFilter[]).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setTypeFilter(filter)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            typeFilter === filter
                              ? 'bg-white text-black'
                              : 'bg-white/[0.06] text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {filter === 'all' ? 'All' : filter === 'direct' ? 'Private' : 'Group'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                    {selectableConversations.map((conversation) => {
                      const display = getConversationDisplay(conversation, currentUserId);
                      const checked = selectedIds.includes(conversation.id);
                      return (
                        <button
                          key={conversation.id}
                          onClick={() => toggleConversation(conversation.id)}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                        >
                          {conversation.type === 'GROUP' ? (
                            <GroupAvatarCollage
                              avatars={conversation.participants.map((p) => p.user.avatar)}
                              size={40}
                            />
                          ) : (
                            <Avatar size="md" src={display.avatar} />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {display.title}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {conversation.type === 'GROUP'
                                ? `${conversation.participants.length} members`
                                : 'Private chat'}
                            </span>
                          </span>
                          {checked && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500">
                              <Check size={13} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-4 border-t border-white/10 px-5 py-4">
                    <button
                      className="font-semibold text-sky-300"
                      onClick={() => setSelectionMode(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-6 border-t border-white/10 bg-white/[0.025] px-6 py-4">
            <button className="font-semibold text-sky-300" onClick={close}>
              Cancel
            </button>
            <button
              disabled={!trimmedName}
              className={`font-semibold transition-opacity ${
                !trimmedName
                  ? 'text-gray-500 cursor-not-allowed opacity-40'
                  : 'text-sky-300 hover:text-sky-200'
              }`}
              onClick={handleSave}
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
