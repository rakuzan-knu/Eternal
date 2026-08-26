import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatTheme } from '../useChatTheme';

vi.mock('../../../shared/lib/indexedDbStorage', () => ({
  idbGet: vi.fn().mockResolvedValue(null),
  idbSet: vi.fn().mockResolvedValue(undefined),
  idbDelete: vi.fn().mockResolvedValue(undefined),
}));

describe('useChatTheme 5-tier resolution', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('resolves default dark theme when no overrides or themes are present', async () => {
    const { result } = renderHook(() => useChatTheme());
    await act(async () => {});
    expect(result.current.theme.backgroundType).toBe('solid');
    expect(result.current.theme.backgroundColor).toBe('#0b0b0c');
  });

  it('resolves serverTheme when provided', async () => {
    const { result } = renderHook(() => useChatTheme('conv-1', 'preset:cyberpunk'));
    await act(async () => {});
    expect(result.current.theme.id).toBe('cyberpunk');
  });

  it('prioritizes sharedTheme over personal serverTheme', async () => {
    const { result } = renderHook(() =>
      useChatTheme('conv-1', 'preset:cyberpunk', 'preset:emerald-dark'),
    );
    await act(async () => {});
    expect(result.current.theme.id).toBe('emerald-dark');
  });

  it('prioritizes local localStorage override over sharedTheme', async () => {
    localStorage.setItem(
      'eternal_chat_theme_conv-1',
      JSON.stringify({
        backgroundType: 'solid',
        backgroundColor: '#123456',
      }),
    );

    const { result } = renderHook(() =>
      useChatTheme('conv-1', 'preset:cyberpunk', 'preset:emerald-dark'),
    );
    await act(async () => {});
    expect(result.current.theme.backgroundColor).toBe('#123456');
  });
});
