import type { Post } from '@prisma/client';
import type { Paginated } from '../../common/pagination';

export type GetAllPostsResult = Paginated<Post>;
