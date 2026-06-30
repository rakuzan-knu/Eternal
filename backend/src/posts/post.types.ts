import { Post } from '@prisma/client';

export type GetAllPostsResult = {
  data: Post[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
};
