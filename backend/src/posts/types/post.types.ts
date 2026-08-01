import type { Paginated } from '../../common/pagination';
import type { PostResponseDto } from '../dto/post-response.dto';

export type GetAllPostsResult = Paginated<PostResponseDto>;
