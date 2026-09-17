import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFeatureFlag } from '../useFeatureFlag';
import { FeatureFlag } from '../../ui/FeatureFlag';
import { queryKeys } from '@/shared/api/queryKeys';

describe('useFeatureFlag', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('returns false by default when flag is not found', () => {
    const { result } = renderHook(() => useFeatureFlag('non_existent_flag'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(false);
  });

  it('returns server evaluated flag state', () => {
    queryClient.setQueryData(queryKeys.featureFlags.all, {
      new_chat_ui: { enabled: true },
      experimental_reels: { enabled: false },
    });

    const { result: chatUi } = renderHook(() => useFeatureFlag('new_chat_ui'), {
      wrapper: createWrapper(),
    });
    const { result: reels } = renderHook(() => useFeatureFlag('experimental_reels'), {
      wrapper: createWrapper(),
    });

    expect(chatUi.current).toBe(true);
    expect(reels.current).toBe(false);
  });

  it('respects local QA override in localStorage over server evaluation', () => {
    queryClient.setQueryData(queryKeys.featureFlags.all, {
      beta_feature: { enabled: false },
    });

    localStorage.setItem('ff_override_beta_feature', 'true');

    const { result } = renderHook(() => useFeatureFlag('beta_feature'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(true);
  });

  it('<FeatureFlag /> component conditionally renders children or fallback', () => {
    queryClient.setQueryData(queryKeys.featureFlags.all, {
      feature_alpha: { enabled: true },
      feature_beta: { enabled: false },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FeatureFlag flag="feature_alpha" fallback={<span>Fallback A</span>}>
          <span>Active A</span>
        </FeatureFlag>
        <FeatureFlag flag="feature_beta" fallback={<span>Fallback B</span>}>
          <span>Active B</span>
        </FeatureFlag>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Active A')).toBeInTheDocument();
    expect(screen.queryByText('Fallback A')).not.toBeInTheDocument();

    expect(screen.getByText('Fallback B')).toBeInTheDocument();
    expect(screen.queryByText('Active B')).not.toBeInTheDocument();
  });
});
