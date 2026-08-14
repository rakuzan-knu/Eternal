export interface CommentType {
  id: string | number;
  author: string;
  avatar?: string | null;
  handle: string;
  text: string;
  time: string;
  parentId?: string | null;
  userId?: string;
  createdAt?: string;
  isVerified?: boolean;
  primaryBadge?: string | null;
}
