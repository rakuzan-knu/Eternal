export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  poster?: string;
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
  type?: 'repost' | string;
  repostedBy?: string;
  media?: PostMedia[];
  image?: string;
  poll?: PollData | null;
  comments?: number;
  reposts?: number;
  likes?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  isOwner?: boolean;
  commentList?: import('../../comment/model/types').CommentType[];
}
