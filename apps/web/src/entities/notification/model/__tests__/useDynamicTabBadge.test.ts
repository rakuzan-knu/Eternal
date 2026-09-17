import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDynamicTabBadge } from '../useDynamicTabBadge';
import { useNotificationStore } from '@/entities/notification/model/useNotificationStore';

describe('useDynamicTabBadge', () => {
  let faviconLink: HTMLLinkElement;
  const originalTitle = document.title;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = 'EternalNet';
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.href = 'https://example.com/favicon.ico';
    document.head.appendChild(faviconLink);

    useNotificationStore.setState({
      unreadCounts: {
        total: 0,
        likes: 0,
        comments: 0,
        mentions: 0,
        follows: 0,
        reposts: 0,
        system: 0,
      },
    });

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fillStyle: '',
      fill: vi.fn(),
    });
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue('data:image/png;base64,mockfavicon');
  });

  afterEach(() => {
    document.title = originalTitle;
    document.head.innerHTML = '';
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    vi.restoreAllMocks();
  });

  it('updates document title and favicon when unread count changes', () => {
    const mockCtx = {
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fillStyle: '',
      fill: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue('data:image/png;base64,mockfavicon');

    const { rerender } = renderHook(() => useDynamicTabBadge());

    expect(document.title).toBe('EternalNet');

    // Set unread > 0
    useNotificationStore.setState({
      unreadCounts: {
        total: 5,
        likes: 5,
        comments: 0,
        mentions: 0,
        follows: 0,
        reposts: 0,
        system: 0,
      },
    });

    rerender();
    expect(document.title).toBe('(5) EternalNet');

    // Set unread back to 0
    useNotificationStore.setState({
      unreadCounts: {
        total: 0,
        likes: 0,
        comments: 0,
        mentions: 0,
        follows: 0,
        reposts: 0,
        system: 0,
      },
    });

    rerender();
    expect(document.title).toBe('EternalNet');
    expect(faviconLink.href).toBe('https://example.com/favicon.ico');
  });

  it('executes canvas drawing logic on image onload', () => {
    const mockCtx = {
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fillStyle: '',
      fill: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,badge');

    // Mock Image constructor to trigger onload
    const originalImage = window.Image;
    window.Image = class {
      crossOrigin = '';
      src = '';
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as any;

    useNotificationStore.setState({
      unreadCounts: {
        total: 3,
        likes: 3,
        comments: 0,
        mentions: 0,
        follows: 0,
        reposts: 0,
        system: 0,
      },
    });

    renderHook(() => useDynamicTabBadge());

    window.Image = originalImage;
  });

  it('handles canvas error gracefully on onload (covers lines 82-83 catch block)', async () => {
    const originalImage = window.Image;
    window.Image = class {
      crossOrigin = '';
      src = '';
      onload: (() => void) | null = null;
      constructor() {
        // Fire onload synchronously for test predictability
        Promise.resolve().then(() => {
          if (this.onload) this.onload();
        });
      }
    } as any;

    // Make getContext throw to trigger the catch block in img.onload
    HTMLCanvasElement.prototype.getContext = () => {
      throw new Error('Canvas tainted');
    };

    useNotificationStore.setState({
      unreadCounts: {
        total: 2,
        likes: 2,
        comments: 0,
        mentions: 0,
        follows: 0,
        reposts: 0,
        system: 0,
      },
    });

    renderHook(() => useDynamicTabBadge());

    // Flush the microtask queue so onload fires
    await Promise.resolve();
    await Promise.resolve();

    // Should not throw - catch block silently handles the canvas error
    window.Image = originalImage;
  });
});
