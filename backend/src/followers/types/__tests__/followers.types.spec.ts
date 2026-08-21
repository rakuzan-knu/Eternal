import { FollowStatus } from '@prisma/client';
import type {
  PublicUserSummary,
  FollowUserRow,
  GetFollowersResult,
  FollowActionResult,
  FollowRequestRow,
  GetFollowRequestsResult,
} from '../followers.types';

describe('followers.types', () => {
  it('conforms to followers type definitions', () => {
    const summary: PublicUserSummary = {
      id: 'usr-1',
      username: 'follower_user',
      displayName: 'Follower',
      avatar: null,
      bio: null,
      isPrivate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const row: FollowUserRow = {
      id: 'f-1',
      user: summary,
    };
    expect(row.user.id).toBe('usr-1');

    const listResult: GetFollowersResult = {
      data: [summary],
      meta: {
        nextCursor: null,
        hasNextPage: false,
      },
    };
    expect(listResult.data).toHaveLength(1);

    const actionResult: FollowActionResult = {
      status: FollowStatus.PENDING,
    };
    expect(actionResult.status).toBe('PENDING');

    const reqRow: FollowRequestRow = {
      id: 'req-1',
      user: summary,
    };
    expect(reqRow.id).toBe('req-1');

    const reqList: GetFollowRequestsResult = {
      data: [summary],
      meta: {
        nextCursor: 'cur-2',
        hasNextPage: true,
      },
    };
    expect(reqList.meta.hasNextPage).toBe(true);
  });
});
