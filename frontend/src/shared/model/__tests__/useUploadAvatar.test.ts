import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploadAvatar } from '../useUploadAvatar';
import { apiClient } from '@/shared/api/httpClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useUploadAvatar', () => {
  it('posts avatar file via formData and invalidates user query', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { avatar: 'new-url' } });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUploadAvatar(), { wrapper });

    const file = new File(['image-bytes'], 'avatar.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await result.current.mutateAsync({ userId: 'usr-1', file });
    });

    expect(postSpy).toHaveBeenCalledWith('/users/usr-1/avatar', expect.any(FormData));
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
