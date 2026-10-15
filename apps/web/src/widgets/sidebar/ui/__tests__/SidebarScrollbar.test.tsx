import React, { createRef } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SidebarScrollbar from '../SidebarScrollbar';

describe('SidebarScrollbar', () => {
  it('does not render when content does not overflow', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true });
    const ref = { current: el };

    const { container } = render(<SidebarScrollbar scrollRef={ref} isSidebarHovered={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders with opacity-0 when idle and opacity-100 when hovered', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 800, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true });
    const ref = { current: el };

    const { container, rerender } = render(
      <SidebarScrollbar scrollRef={ref} isSidebarHovered={false} />,
    );

    const track = container.firstElementChild as HTMLElement;
    expect(track).not.toBeNull();
    expect(track.className).toContain('opacity-0');
    expect(track.className).toContain('transition-opacity');
    expect(track.className).toContain('duration-300');

    rerender(<SidebarScrollbar scrollRef={ref} isSidebarHovered={true} />);
    expect(track.className).toContain('opacity-100');
  });

  it('keeps opacity-100 while dragging thumb even if sidebar is not hovered', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 800, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true, writable: true });
    const ref = { current: el };

    const { container, rerender } = render(
      <SidebarScrollbar scrollRef={ref} isSidebarHovered={true} />,
    );

    const track = container.firstElementChild as HTMLElement;
    const thumb = track.firstElementChild as HTMLElement;

    // Start drag
    act(() => {
      fireEvent.mouseDown(thumb, { clientY: 100 });
    });

    // Unhover sidebar during drag
    rerender(<SidebarScrollbar scrollRef={ref} isSidebarHovered={false} />);
    expect(track.className).toContain('opacity-100');

    // End drag
    act(() => {
      fireEvent.mouseUp(window);
    });

    expect(track.className).toContain('opacity-0');
  });
});
