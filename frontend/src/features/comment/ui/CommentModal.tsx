import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import Avatar from '../../../shared/ui/Avatar';
import { CommentItem } from '../../../entities/comment/ui/CommentItem';
import { CommentForm } from '../ui/CommentForm';

export function CommentModal() {
  const { isCommentModalOpen, activePostForComments, closeCommentModal } = useUIStore();
  if (!isCommentModalOpen || !activePostForComments) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col p-5 shadow-2xl shadow-black/80">
        <div className="flex justify-between items-center pb-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-gray-400">
            Допис користувача {activePostForComments.author}
          </h3>
          <button
            onClick={closeCommentModal}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-4 custom-scrollbar">
          <div className="flex gap-3 items-start border-b border-white/[0.06] pb-4 mt-1">
            <Avatar size="sm" emoji={activePostForComments.avatar} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{activePostForComments.author}</span>
                <span className="text-xs text-gray-500">@{activePostForComments.handle}</span>
              </div>
              <p className="text-gray-200 text-sm mt-1 whitespace-pre-line">
                {activePostForComments.text}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {activePostForComments.commentList?.length ? (
              activePostForComments.commentList.map((c) => <CommentItem key={c.id} comment={c} />)
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-gray-500 gap-2">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm font-medium">Немає коментарів</p>
                <p className="text-xs opacity-60">Додайте перший коментар.</p>
              </div>
            )}
          </div>
        </div>

        <CommentForm currentUserHandle="Ayate" />
      </div>
    </div>
  );
}
