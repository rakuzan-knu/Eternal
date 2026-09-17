import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizablePanel } from '../useResizablePanel';

describe('useResizablePanel', () => {
  it('initializes with default width and supports handle mouse start and resizing', () => {
    const { result } = renderHook(() => useResizablePanel(200, 600, 300));

    expect(result.current.width).toBe(300);
    expect(result.current.isResizing).toBe(false);

    act(() => {
      result.current.handleResizeStart({
        preventDefault: () => {},
        clientX: 100,
      } as React.MouseEvent);
    });

    expect(result.current.isResizing).toBe(true);

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
    });

    expect(result.current.width).toBe(350);

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(result.current.isResizing).toBe(false);

    // Test hover state
    act(() => {
      result.current.setIsHandleHovered(true);
    });
    expect(result.current.isHandleHovered).toBe(true);

    // Mousemove while not resizing does nothing
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));
    });
    expect(result.current.width).toBe(350);

    // Mousemove when isResizing is true but dragStart.current is null
    act(() => {
      result.current.handleResizeStart({ preventDefault: () => {}, clientX: 100 } as any);
    });
    // simulate dragStart becoming null before mousemove
    (result.current as any).dragStart = null;
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
  });
});
