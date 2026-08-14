import { apiClient as api } from '@/shared/api/httpClient';
import { CommentType } from '@/entities/comment/model/types';
import { formatRelativeTime } from '@/shared/lib/formatRelativeTime';

export interface CommentListPage {
  comments: CommentType[];
  nextCursor?: string | null;
}

export function normalizeComment(c: Record<string, unknown> | null | undefined): CommentType {
  if (!c) {
    return {
      id: '',
      author: 'User',
      handle: 'user',
      avatar: null,
      text: '',
      time: 'just now',
      userId: '',
    };
  }

  const userObj = c.user as Record<string, unknown> | undefined;

  return {
    id: (c.id as string | number) ?? '',
    author:
      (c.author as string | undefined) ??
      (userObj?.displayName as string | undefined) ??
      (userObj?.username as string | undefined) ??
      'User',
    handle: (c.handle as string | undefined) ?? (userObj?.username as string | undefined) ?? 'user',
    avatar:
      (c.avatar as string | null | undefined) ??
      (userObj?.avatar as string | null | undefined) ??
      null,
    text: (c.text as string | undefined) ?? '',
    time: c.createdAt ? formatRelativeTime(c.createdAt as string) : 'just now',
    createdAt: c.createdAt as string | undefined,
    parentId: (c.parentId as string | null | undefined) ?? null,
    userId: (c.userId as string | undefined) ?? '',
    isVerified: Boolean(c.isVerified ?? userObj?.isVerified),
    primaryBadge:
      (c.primaryBadge as string | null | undefined) ??
      (userObj?.primaryBadge as string | null | undefined) ??
      null,
  };
}

export const commentsApi = {
  getComments: async (postId: string | number, cursor?: string): Promise<CommentListPage> => {
    const res = await api.get<Record<string, unknown>>(`/posts/${postId}/comments`, {
      params: { after: cursor, limit: 50 },
    });
    const raw = res.data;
    const rawList = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.comments)
        ? raw.comments
        : Array.isArray(raw)
          ? raw
          : [];
    const meta = raw?.meta as { nextCursor?: string | null } | undefined;
    const nextCursor = meta?.nextCursor ?? (raw?.nextCursor as string | null | undefined) ?? null;
    return {
      comments: (rawList as Record<string, unknown>[]).map(normalizeComment),
      nextCursor,
    };
  },

  addComment: async (
    postId: string | number,
    text: string,
    parentId?: string,
  ): Promise<CommentType> => {
    const res = await api.post<Record<string, unknown>>(`/posts/${postId}/comments`, {
      text,
      parentId,
    });
    return normalizeComment(res.data);
  },

  deleteComment: async (commentId: string | number): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  },
};
