import React, { useState } from 'react';
import { Bookmark, Plus, ArrowLeft, Trash2, Lock, Layers } from 'lucide-react';
import { useSavedPosts } from '@/entities/post/model/useSavedPosts';
import { useSavedCollectionsStore } from '@/entities/post/model/useSavedCollectionsStore';
import { PostCard } from '@/widgets/post/ui/PostCard';
import { SkeletonFeed } from '@/entities/post/ui/SkeletonPostCard';
import { CreateCollectionModal } from './CreateCollectionModal';
import { CollectionCardCover } from './CollectionCardCover';
import { SAVED_POSTS_KEY } from '@/shared/api/queryKeys';

interface SavedPostsViewProps {
  userId: string;
}

export function SavedPostsView({ userId }: SavedPostsViewProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading } = useSavedPosts();
  const allSavedPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  const allCollections = useSavedCollectionsStore((s) => s.collections);
  const collections = React.useMemo(
    () => allCollections.filter((c) => c.userId === userId),
    [allCollections, userId],
  );
  const createCollection = useSavedCollectionsStore((s) => s.createCollection);
  const deleteCollection = useSavedCollectionsStore((s) => s.deleteCollection);

  const handleCreateCollection = (name: string, selectedPostIds: string[]) => {
    const col = createCollection(userId, name);
    selectedPostIds.forEach((postId) => {
      useSavedCollectionsStore.getState().addPostToCollection(col.id, postId);
    });
  };

  const getCollectionCover = (postIds: string[]) => {
    const matchingPosts = allSavedPosts.filter((p) => postIds.includes(String(p.id)));
    for (const post of matchingPosts) {
      const img = post.media?.find((m) => m.type === 'image')?.url || post.image;
      if (img) return img;
    }
    return null;
  };

  const getAllPostsCover = () => {
    for (const post of allSavedPosts) {
      const img = post.media?.find((m) => m.type === 'image')?.url || post.image;
      if (img) return img;
    }
    return null;
  };

  if (isLoading) {
    return <SkeletonFeed count={3} />;
  }

  // Inside a selected collection
  if (selectedCollectionId !== null) {
    const isAll = selectedCollectionId === 'all';
    const activeCollection = collections.find((c) => c.id === selectedCollectionId);
    const activeTitle = isAll ? 'All posts' : activeCollection?.name || 'Collection';

    const activePosts = isAll
      ? allSavedPosts
      : allSavedPosts.filter((p) => activeCollection?.postIds.includes(String(p.id)));

    return (
      <div className="w-full flex flex-col gap-5 animate-fadeIn">
        {/* Detail Top Navigation */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setSelectedCollectionId(null)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <ArrowLeft size={16} />
            </div>
            <span>Back to collections</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">
              {activePosts.length} {activePosts.length === 1 ? 'post' : 'posts'}
            </span>
            {!isAll && activeCollection && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete collection "${activeCollection.name}"?`)) {
                    deleteCollection(activeCollection.id);
                    setSelectedCollectionId(null);
                  }
                }}
                className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Delete collection"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-1">{activeTitle}</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Lock size={12} /> Only you can see what you've saved
          </p>
        </div>

        {/* Collection Posts Feed */}
        {activePosts.length > 0 ? (
          <div className="flex flex-col gap-4">
            {activePosts.map((post) => (
              <PostCard key={post.id} post={post} queryKey={[SAVED_POSTS_KEY]} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-[2rem] bg-white/[0.01]">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-gray-400">
              <Bookmark size={28} />
            </div>
            <p className="text-white font-semibold text-base mb-1">
              No saved posts in this collection
            </p>
            <p className="text-gray-500 text-xs max-w-xs">
              Save posts by clicking the bookmark icon on any post in your feed.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Root Collections View
  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Lock size={13} className="text-gray-400" />
          <span>Only you can see saved posts</span>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
        >
          <Plus size={15} />
          <span>Create a new collection</span>
        </button>
      </div>

      {allSavedPosts.length === 0 && collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
          <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mb-5 text-gray-400 shadow-xl">
            <Bookmark size={36} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Your collections</h3>
          <p className="text-gray-400 text-xs max-w-sm leading-relaxed mb-6">
            Create a new collection of your favorite posts. Your collections will be safely stored
            here.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-xs px-6 py-2.5 rounded-full hover:opacity-95 transition-all shadow-lg hover:shadow-pink-500/25 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Create a new collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Card 1: All Posts Collection */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedCollectionId('all')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedCollectionId('all');
              }
            }}
            className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer flex flex-col justify-end p-4"
          >
            <CollectionCardCover
              coverImg={getAllPostsCover()}
              post={allSavedPosts.length > 0 ? allSavedPosts[0] : null}
              emptyIcon={<Layers size={32} />}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

            {/* Content Info */}
            <div className="relative z-10 flex flex-col">
              <span className="text-sm font-bold text-white drop-shadow-md">All posts</span>
              <span className="text-[11px] text-gray-400 font-medium">
                {allSavedPosts.length} {allSavedPosts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>
          </div>

          {/* User Custom Collections */}
          {collections.map((col) => {
            const coverImg = getCollectionCover(col.postIds);
            const count = col.postIds.length;
            const firstPost = allSavedPosts.find((p) => col.postIds.includes(String(p.id)));

            return (
              <div
                key={col.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCollectionId(col.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCollectionId(col.id);
                  }
                }}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer flex flex-col justify-end p-4"
              >
                <CollectionCardCover
                  coverImg={coverImg}
                  post={firstPost || null}
                  emptyIcon={<Bookmark size={30} />}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                {/* Content Info */}
                <div className="relative z-10 flex flex-col">
                  <span className="text-sm font-bold text-white drop-shadow-md truncate">
                    {col.name}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {count} {count === 1 ? 'post' : 'posts'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Collection Modal */}
      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        savedPosts={allSavedPosts}
        onCreate={handleCreateCollection}
      />
    </div>
  );
}
