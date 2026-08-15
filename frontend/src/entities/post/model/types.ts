import type {
  PostResponseDto,
  PostMediaResponseDto,
  PostPollDto,
  PostPollOptionDto,
  MediaType,
} from '@backend/common/contracts';

export type PostMediaType = 'image' | 'video' | 'IMAGE' | 'VIDEO' | MediaType;

export interface PostMedia extends Omit<Partial<PostMediaResponseDto>, 'type' | 'poster'> {
  id?: string;
  type: PostMediaType;
  url: string;
  poster?: string | null;
  blurhash?: string | null;
  width?: number;
  height?: number;
  aspectRatio?: number;
  order?: number;
}

export interface PollOptionResult extends Partial<PostPollOptionDto> {
  id: string;
  text: string;
  votes: number;
  votesCount?: number;
}

export interface PollData extends Omit<Partial<PostPollDto>, 'options'> {
  id: string;
  options: PollOptionResult[];
  totalVotes: number;
  myVoteOptionId: string | null;
}

export interface PostType extends Omit<Partial<PostResponseDto>, 'id' | 'media' | 'poll'> {
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

export interface PollVoter {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
}

export interface PollVoterGroup {
  optionId: string;
  voters: PollVoter[];
}
