import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatTheme } from '../useChatTheme';
import { chatApi } from '../../api/chatApi';

vi.mock('../../../shared/lib/indexedDbStorage', () => ({
  idbGet: vi.fn().mockResolvedValue(null),
  idbSet: vi.fn().mockResolvedValue(undefined),
  idbDelete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    setTheme: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('useChatTheme 5-tier resolution and mutations', () => {
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

  it('applies theme with syncDevices=true and syncDevices=false', async () => {
    const { result } = renderHook(() => useChatTheme('conv-1'));
    await act(async () => {});

    // 1. apply with syncDevices = true
    await act(async () => {
      await result.current.applyTheme(
        { backgroundType: 'solid', backgroundColor: '#aabbcc' } as any,
        { syncDevices: true, applyToAll: false },
      );
    });
    expect(chatApi.setTheme).toHaveBeenCalledWith('conv-1', expect.any(String), false);
    expect(result.current.theme.backgroundColor).toBe('#aabbcc');

    // 2. apply with syncDevices = false and applyToAll = true
    await act(async () => {
      await result.current.applyTheme(
        { backgroundType: 'solid', backgroundColor: '#112233' } as any,
        { syncDevices: false, applyToAll: true },
      );
    });
    expect(result.current.theme.backgroundColor).toBe('#112233');

    // 3. apply with syncDevices = false and applyToAll = false
    await act(async () => {
      await result.current.applyTheme(
        { backgroundType: 'solid', backgroundColor: '#445566' } as any,
        { syncDevices: false, applyToAll: false },
      );
    });
    expect(result.current.theme.backgroundColor).toBe('#445566');
  });

  it('reverts theme with syncDevices=true and applyToAll=true', async () => {
    const { result } = renderHook(() => useChatTheme('conv-1'));
    await act(async () => {});

    await act(async () => {
      await result.current.revertTheme({ syncDevices: true, applyToAll: true });
    });
    expect(chatApi.setTheme).toHaveBeenCalledWith('conv-1', 'default', true);

    await act(async () => {
      await result.current.revertTheme({ syncDevices: false, applyToAll: false });
    });
  });

  it('handles applyTheme with syncDevices=true and applyToAll=true, and handles localStorage setItem throwing', async () => {
    const { result } = renderHook(() => useChatTheme('conv-1'));
    await act(async () => {});

    await act(async () => {
      await result.current.applyTheme(
        { backgroundType: 'solid', backgroundColor: '#998877' } as any,
        { syncDevices: true, applyToAll: true },
      );
    });
    expect(chatApi.setTheme).toHaveBeenCalledWith('conv-1', expect.any(String), true);

    // localStorage exception
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    await act(async () => {
      await result.current.applyTheme(
        { backgroundType: 'solid', backgroundColor: '#223344' } as any,
        { syncDevices: false, applyToAll: true },
      );
      await result.current.applyTheme(
        { backgroundType: 'solid', backgroundColor: '#334455' } as any,
        { syncDevices: false, applyToAll: false },
      );
    });

    setItemSpy.mockRestore();
  });

  it('tracks and cleans up blob URLs on change and unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useChatTheme('conv-1'));
    await act(async () => {});

    // Set theme with blob url
    await act(async () => {
      await result.current.applyTheme({
        backgroundType: 'image',
        bgImageUrl: 'blob:http://localhost/test-blob-1',
      } as any);
    });

    // Change to another blob url
    await act(async () => {
      await result.current.applyTheme({
        backgroundType: 'image',
        bgImageUrl: 'blob:http://localhost/test-blob-2',
      } as any);
    });

    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/test-blob-1');

    unmount();
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/test-blob-2');
    revokeSpy.mockRestore();
  });

  it('handles multi-tab custom events and BroadcastChannel errors safely', async () => {
    const origBroadcastChannel = window.BroadcastChannel;
    window.BroadcastChannel = vi.fn().mockImplementation(() => {
      throw new Error('BroadcastChannel not supported');
    }) as any;

    renderHook(() => useChatTheme('conv-1'));
    await act(async () => {});

    // Dispatch custom event without theme payload to trigger resolveAndApplyTheme
    act(() => {
      window.dispatchEvent(
        new CustomEvent('eternal_theme_updated', {
          detail: { conversationId: 'conv-1' },
        }),
      );
    });

    window.BroadcastChannel = origBroadcastChannel;
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
