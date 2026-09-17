export interface ReelAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isVerified?: boolean;
  isFollowing?: boolean;
}

export interface ReelItem {
  id: string;
  authorId: string;
  caption: string;
  videoUrl: string;
  hlsUrl: string | null;
  thumbnailUrl: string | null;
  blurhash: string | null;
  thumbhash: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  audioTitle: string | null;
  audioArtist: string | null;
  audioUrl: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  savedCount?: number;
  createdAt: string;
  author: ReelAuthor;
}

export const DEFAULT_SEED_REELS: ReelItem[] = [
  {
    id: 'reel-profkino-1',
    authorId: 'user-profkino',
    caption: 'Сосед-авторитет врубил шумит ночью, но за бессонную ночь дочери',
    videoUrl: '/videos/sample-reel.mp4',
    hlsUrl: null,
    thumbnailUrl: null,
    blurhash: 'U35;y-of00ay_3j[00ay00fQ~qj[00j[00ay',
    thumbhash: null,
    duration: 15,
    width: 720,
    height: 1280,
    audioTitle: 'Original Audio',
    audioArtist: 'PROFKINO',
    audioUrl: null,
    viewsCount: 14200,
    likesCount: 1280,
    commentsCount: 94,
    sharesCount: 312,
    isLiked: false,
    isSaved: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    author: {
      id: 'user-profkino',
      username: 'profkino',
      displayName: 'PROFKINO',
      avatar: '/images/profkino-avatar.webp',
      isVerified: true,
      isFollowing: false,
    },
  },
  {
    id: 'reel-profkino-2',
    authorId: 'user-profkino',
    caption: 'Когда понял, кто на самом деле держит район 🎬 Неожиданный финал',
    videoUrl: '/videos/sample-reel.mp4',
    hlsUrl: null,
    thumbnailUrl: null,
    blurhash: 'U46R;4of00ay_3j[00ay00fQ~qj[00j[00ay',
    thumbhash: null,
    duration: 18,
    width: 720,
    height: 1280,
    audioTitle: 'Dramatic Suspense Theme',
    audioArtist: 'Soundtrack Studio',
    audioUrl: null,
    viewsCount: 28900,
    likesCount: 3410,
    commentsCount: 215,
    sharesCount: 890,
    isLiked: false,
    isSaved: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    author: {
      id: 'user-profkino',
      username: 'profkino',
      displayName: 'PROFKINO',
      avatar: '/images/profkino-avatar.webp',
      isVerified: true,
      isFollowing: false,
    },
  },
];
