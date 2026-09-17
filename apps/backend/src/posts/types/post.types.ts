import type { Paginated } from '../../common/pagination';
import type { PostResponseDto } from '@common/contracts';

export type GetAllPostsResult = Paginated<PostResponseDto>;
