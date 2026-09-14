import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatTheme } from '../useChatTheme';

vi.mock('../../../shared/lib/indexedDbStorage', () => ({
  idbGet: vi.fn().mockResolvedValue(null),
  idbSet: vi.fn().mockResolvedValue(undefined),
  idbDelete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    setTheme: vi.fn().mockResolvedValue(undefined),
  },
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

  it('applies theme and preserves local storage even when syncDevices is true', async () => {
    const { result } = renderHook(() => useChatTheme('conv-1', 'default'));
    await act(async () => {});

    await act(async () => {
      await result.current.applyTheme(
        {
          backgroundType: 'shader',
          shaderPresetId: 'synthwave-grid',
          backgroundColor: '#0b0b0c',
          gradientColors: [],
          gradientAngle: 135,
          bgBrightness: 0.8,
          bgBlur: 0,
          audioReactive: true,
          parallax3d: true,
          bubbleType: 'gradient',
          bubbleColor: '#9333ea',
          bubbleGradientColors: ['#9333ea', '#6366f1'],
          bubbleGradientAngle: 135,
          bubbleContinuousGradient: false,
          bubbleTextColor: '#ffffff',
          bubbleOpacity: 0.95,
          bubbleBlur: 16,
          incomingBubbleTextColor: '#ffffff',
          incomingBubbleOpacity: 0.85,
          incomingBubbleBlur: 16,
        },
        { syncDevices: true, applyToAll: false },
      );
    });

    expect(result.current.theme.backgroundType).toBe('shader');
    expect(result.current.theme.shaderPresetId).toBe('synthwave-grid');
    // Verify it was preserved in localStorage and not deleted
    const stored = localStorage.getItem('eternal_chat_theme_conv-1');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).shaderPresetId).toBe('synthwave-grid');
  });
});
