import React from 'react';
import { MessageSquare, Repeat, Heart, Share } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { useUIStore, PostType } from '../../../shared/model/useUIStore';

export function PostCard({ post }: { post: PostType }) {
  const openCommentModal = useUIStore((state) => state.openCommentModal);

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 shadow-lg flex flex-col gap-3 transition-all hover:bg-white/[0.03]">
      {post.type === 'repost' && (
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium pl-10">
          <Repeat size={12} /> {post.repostedBy}
        </div>
      )}
      <div className="flex gap-4 items-start">
        <Avatar size="md" emoji={post.avatar} />
        <div className="flex flex-col flex-1 gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{post.author}</span>
            <span className="text-xs text-gray-500">
              @{post.handle} • {post.time}
            </span>
          </div>
          <p className="text-gray-200 text-[15px] leading-relaxed mt-1">{post.text}</p>

          {post.image && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-white/5 max-h-[300px]">
              <img src={post.image} alt="Post Attachment" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex justify-between items-center text-gray-500 text-xs mt-4 max-w-[400px]">
            <button
              onClick={() => openCommentModal(post)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-blue-400 transition-colors"
            >
              <MessageSquare size={16} /> {post.comments}
            </button>
            <button className="flex items-center gap-1.5 cursor-pointer hover:text-green-400">
              <Repeat size={16} /> {post.reposts}
            </button>
            <button className="flex items-center gap-1.5 cursor-pointer hover:text-pink-500">
              <Heart size={16} /> {post.likes}
            </button>
            <button className="flex items-center gap-1.5 cursor-pointer hover:text-gray-300">
              <Share size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
