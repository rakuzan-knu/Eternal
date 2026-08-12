import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCheck, Pencil, Trash2 } from 'lucide-react';
import { ChatFolder } from '../model/useChatFoldersStore';

interface ChatFolderContextMenuProps {
  folder: ChatFolder;
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}

export default function ChatFolderContextMenu({
  folder,
  x,
  y,
  onClose,
  onEdit,
  onMarkRead,
  onDelete,
}: ChatFolderContextMenuProps) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [onClose]);

  const itemClass =
    'w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm font-semibold text-gray-100 hover:bg-white/[0.07] transition-colors';

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className="fixed z-[520] w-[184px] overflow-hidden rounded-[18px] border border-white/10 bg-[#1f1f23]/94 py-1 shadow-[0_18px_48px_rgba(0,0,0,0.58)] backdrop-blur-2xl backdrop-saturate-150 animate-menuIn"
      style={{ left: x, top: y }}
    >
      <button className={itemClass} onClick={onEdit}>
        <Pencil size={17} /> Edit folder
      </button>
      <button className={itemClass} onClick={onMarkRead}>
        <CheckCheck size={17} /> Mark all as read
      </button>
      {!folder.isSystem && (
        <button className={`${itemClass} text-red-400 hover:bg-red-500/10`} onClick={onDelete}>
          <Trash2 size={17} /> Delete
        </button>
      )}
    </div>,
    document.body,
  );
}
