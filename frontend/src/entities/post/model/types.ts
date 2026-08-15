export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  poster?: string;
  blurhash?: string | null;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface PollOptionResult {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  id: string;
  options: PollOptionResult[];
  totalVotes: number;
  myVoteOptionId: string | null;
}

export interface PostType {
  id: string | number;
  authorId: string;
  author: string;
  avatar?: string | null;
  handle: string;
  text: string;
  createdAt: string;
  isVerified?: boolean;
  primaryBadge?: string | null;
  type?: 'repost' | string;
  repostedBy?: string;
  media?: PostMedia[];
  image?: string;
  poll?: PollData | null;
  comments?: number;
  reposts?: number;
  likes?: number;
  sharesCount?: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  isOwner?: boolean;
  commentList?: import('../../comment/model/types').CommentType[];
}
