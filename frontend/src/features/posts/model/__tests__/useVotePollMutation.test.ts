import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVotePollMutation } from '../useVotePollMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useVotePollMutation', () => {
  it('optimistically updates poll vote count and myVoteOptionId for first-time vote', async () => {
    const queryClient = new QueryClient();
    const queryKey = ['posts-feed'];

    queryClient.setQueryData(queryKey, {
      pages: [
        {
          posts: [
            {
              id: 'post-1',
              poll: {
                totalVotes: 2,
                myVoteOptionId: null,
                options: [
                  { id: 'opt-1', text: 'Option 1', votes: 1 },
                  { id: 'opt-2', text: 'Option 2', votes: 1 },
                ],
              },
            },
          ],
        },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useVotePollMutation('post-1', queryKey), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate('opt-1');
    });

    const updatedData = queryClient.getQueryData<{
      pages: {
        posts: {
          id: string;
          poll: {
            totalVotes: number;
            myVoteOptionId: string;
            options: { id: string; votes: number }[];
          };
        }[];
      }[];
    }>(queryKey);

    expect(updatedData?.pages[0].posts[0].poll.totalVotes).toBe(3);
    expect(updatedData?.pages[0].posts[0].poll.myVoteOptionId).toBe('opt-1');
    expect(updatedData?.pages[0].posts[0].poll.options[0].votes).toBe(2);
  });

  it('optimistically decrements previous option and maintains totalVotes when changing vote', async () => {
    const queryClient = new QueryClient();
    const queryKey = ['posts-feed'];

    queryClient.setQueryData(queryKey, {
      pages: [
        {
          posts: [
            {
              id: 'post-1',
              poll: {
                totalVotes: 1,
                myVoteOptionId: 'opt-1',
                options: [
                  { id: 'opt-1', text: 'Option 1', votes: 1 },
                  { id: 'opt-2', text: 'Option 2', votes: 0 },
                ],
              },
            },
          ],
        },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useVotePollMutation('post-1', queryKey), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate('opt-2');
    });

    const updatedData = queryClient.getQueryData<{
      pages: {
        posts: {
          id: string;
          poll: {
            totalVotes: number;
            myVoteOptionId: string;
            options: { id: string; votes: number }[];
          };
        }[];
      }[];
    }>(queryKey);

    expect(updatedData?.pages[0].posts[0].poll.totalVotes).toBe(1);
    expect(updatedData?.pages[0].posts[0].poll.myVoteOptionId).toBe('opt-2');
    expect(updatedData?.pages[0].posts[0].poll.options[0].votes).toBe(0);
    expect(updatedData?.pages[0].posts[0].poll.options[1].votes).toBe(1);
  });
});
