import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClickOutside } from '../useClickOutside';

describe('useClickOutside', () => {
  it('calls onOutside when mousedown occurs outside element', () => {
    const onOutside = vi.fn();
    const targetEl = document.createElement('div');
    const outsideEl = document.createElement('button');
    document.body.appendChild(targetEl);
    document.body.appendChild(outsideEl);

    const ref = { current: targetEl };
    renderHook(() => useClickOutside(ref, onOutside));

    outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onOutside).toHaveBeenCalledTimes(1);

    document.body.removeChild(targetEl);
    document.body.removeChild(outsideEl);
  });

  it('does not call onOutside when mousedown occurs inside element', () => {
    const onOutside = vi.fn();
    const targetEl = document.createElement('div');
    const childEl = document.createElement('span');
    targetEl.appendChild(childEl);
    document.body.appendChild(targetEl);

    const ref = { current: targetEl };
    renderHook(() => useClickOutside(ref, onOutside));

    childEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onOutside).not.toHaveBeenCalled();

    document.body.removeChild(targetEl);
  });

  it('removes listener on unmount', () => {
    const onOutside = vi.fn();
    const targetEl = document.createElement('div');
    const outsideEl = document.createElement('button');
    document.body.appendChild(targetEl);
    document.body.appendChild(outsideEl);

    const ref = { current: targetEl };
    const { unmount } = renderHook(() => useClickOutside(ref, onOutside));

    unmount();
    outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onOutside).not.toHaveBeenCalled();

    document.body.removeChild(targetEl);
    document.body.removeChild(outsideEl);
  });
});
