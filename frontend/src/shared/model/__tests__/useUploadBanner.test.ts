import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploadBanner } from '../useUploadBanner';
import { apiClient } from '@/shared/api/httpClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useUploadBanner', () => {
  it('posts banner file and positionY via formData and invalidates user query', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { banner: 'new-url' } });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useUploadBanner(), { wrapper });

    const file = new File(['banner-bytes'], 'banner.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await result.current.mutateAsync({ userId: 'usr-1', file, positionY: 35 });
    });

    expect(postSpy).toHaveBeenCalledWith('/users/usr-1/banner', expect.any(FormData));
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
