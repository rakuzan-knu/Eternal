import type { InfiniteData } from '@tanstack/react-query';
import type { CompactFeedResponse, FeedPage } from '../api/postsApi';
import type { PostType } from './types';

/** Apply one normalized post mutation to ordinary and compact cache projections. */
export function mapPostFeedData<T>(old: T, transform: (post: PostType) => PostType | null): T {
  if (!old || typeof old !== 'object' || !('pages' in old) || !Array.isArray(old.pages)) return old;
  const data = old as unknown as InfiniteData<FeedPage | CompactFeedResponse>;
  return {
    ...data,
    pages: data.pages.map((page) => {
      if ('posts' in page)
        return {
          ...page,
          posts: page.posts.map(transform).filter((post): post is PostType => post !== null),
        };
      if (!('data' in page) || !Array.isArray(page.data)) return page;
      return {
        ...page,
        data: page.data.flatMap((item) => {
          const projected: PostType = {
            id: item.id,
            authorId: item.author.id,
            author: item.author.displayName,
            handle: item.author.username,
            text: item.content,
            createdAt: item.createdAt,
            likes: item.stats.likes,
            comments: item.stats.comments,
            reposts: item.stats.reposts,
            ...item.viewer,
          };
          const post = transform(projected);
          if (!post) return [];
          return [
            {
              ...item,
              content: post.text,
              stats: {
                ...item.stats,
                likes: post.likes ?? item.stats.likes,
                comments: post.comments ?? item.stats.comments,
                reposts: post.reposts ?? item.stats.reposts,
              },
              viewer: {
                ...item.viewer,
                isLiked: post.isLiked ?? item.viewer.isLiked,
                isSaved: post.isSaved ?? item.viewer.isSaved,
                isReposted: post.isReposted ?? item.viewer.isReposted,
                isOwner: post.isOwner ?? item.viewer.isOwner,
              },
            },
          ];
        }),
      };
    }),
  } as T;
}
