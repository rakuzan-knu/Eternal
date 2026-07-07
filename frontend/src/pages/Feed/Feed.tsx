import React from 'react';
import CreatePost from '../../features/posts/ui/CreatePost';
import { CommentModal } from '@/features/comment/ui/CommentModal';

interface PostSubmitData {
  text: string;
}

export default function FeedPage() {
  const handleNewPost = (postData: PostSubmitData) => {
    console.log('Новий пост готовий до відправки:', postData);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      <CreatePost onPostSubmit={handleNewPost} />
      <CommentModal />

      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
        <p className="text-gray-500 font-medium text-base">Тут поки що нічого немає...</p>
        <p className="text-xs text-gray-600 mt-1">Основна стрічка новин нашої платформи.</p>
      </div>
    </div>
  );
}
