import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUIStore } from '../shared/model/useUIStore';
import ProfileHeader from '../entities/profile/ui/ProfileHeader';
import ProfileTabs from '../shared/ui/ProfileTabs';
import CreatePost from '../features/posts/ui/CreatePost';
import { PostCard } from '../entities/post/ui/PostCard';
import { CommentModal } from '../features/comment/ui/CommentModal';

interface PostSubmitData {
  text: string;
}

export default function ProfilePage() {
  const { username } = useParams();
  const currentUsername = username || 'my_profile';

  const [activeTab, setActiveTab] = useState<'posts' | 'reposts'>('posts');
  const openEditProfile = useUIStore((state) => state.openEditProfile);

  const userPosts = [
    {
      id: 1,
      type: 'post',
      author: 'Ayate',
      handle: currentUsername,
      avatar: '💀',
      text: 'Thats fire!',
      time: '3 дн.',
      likes: 12,
      comments: 2,
      reposts: 0,
    },
    {
      id: 2,
      type: 'post',
      author: 'Ayate',
      handle: currentUsername,
      avatar: '💀',
      text: 'Eternal CEO is here!',
      time: '5 дн.',
      likes: 42,
      comments: 7,
      reposts: 3,
    },
  ];

  const userReposts = [
    {
      id: 3,
      type: 'repost',
      repostedBy: 'Ви репостнули',
      author: 'Kolya_Dev',
      handle: 'kolya_tech',
      avatar: '💻',
      text: 'New update available!',
      time: '1 кв.',
      likes: 89,
      comments: 12,
      reposts: 15,
    },
  ];

  const activeFeed = activeTab === 'posts' ? userPosts : userReposts;

  const handleProfilePostSubmit = (postData: PostSubmitData) => {
    console.log('Пост створено з профілю користувача:', postData);
  };

  return (
    <div className="w-full flex flex-col animate-fadeIn">
      <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] mb-6">
        <ProfileHeader username={currentUsername} onEditClick={openEditProfile} />
        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {activeTab === 'posts' && (
        <div className="mb-4">
          <CreatePost onPostSubmit={handleProfilePostSubmit} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {activeFeed.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <CommentModal />
    </div>
  );
}
