import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Link, MemoryRouter, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '../ScrollToTop';
import { resetSessionStores } from '@/shared/model/resetSession';

function Navigation({ clampOnLeave = false }: { clampOnLeave?: boolean }) {
  const navigate = useNavigate();
  return (
    <>
      <Link
        to="/post/1"
        onClick={() => {
          if (clampOnLeave)
            Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
        }}
      >
        Open post
      </Link>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
}

describe('ScrollToTop Component', () => {
  const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
  const originalHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight');
  let height = 3000;
  let frameId = 0;
  let frames: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    height = 3000;
    frames = new Map();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      get: () => height,
      configurable: true,
    });
    window.scrollTo = vi.fn((options?: ScrollToOptions | number) => {
      if (typeof options === 'object') {
        Object.defineProperty(window, 'scrollY', {
          value: Math.min(options.top ?? 0, Math.max(0, height - window.innerHeight)),
          configurable: true,
        });
      }
    });
    document.documentElement.scrollTo = vi.fn();
    document.body.scrollTo = vi.fn();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalScrollY) Object.defineProperty(window, 'scrollY', originalScrollY);
    if (originalHeight) {
      Object.defineProperty(document.documentElement, 'scrollHeight', originalHeight);
    } else {
      Reflect.deleteProperty(document.documentElement, 'scrollHeight');
    }
  });

  function nextFrame() {
    act(() => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(performance.now()));
    });
  }

  function renderNavigation(clampOnLeave = false) {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <Navigation clampOnLeave={clampOnLeave} />
      </MemoryRouter>,
    );
  }

  it('scrolls window to (0, 0) upon route render without hash', () => {
    render(
      <MemoryRouter initialEntries={['/download']}>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('scrolls element into view when hash is provided', () => {
    const mockScrollIntoView = vi.fn();
    const testEl = document.createElement('div');
    testEl.id = 'all-jobs';
    testEl.scrollIntoView = mockScrollIntoView;
    document.body.appendChild(testEl);

    render(
      <MemoryRouter initialEntries={['/careers#all-jobs']}>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    document.body.removeChild(testEl);
  });

  it('captures the outgoing position before route DOM clamping and waits for feed height on Back', () => {
    renderNavigation(true);
    Object.defineProperty(window, 'scrollY', { value: 760, configurable: true });
    // No scroll event: capture must also handle a click before a pending event.
    fireEvent.click(screen.getByText('Open post'));
    expect(window.scrollY).toBe(0);

    height = 400;
    fireEvent.click(screen.getByText('Back'));
    nextFrame();
    expect(window.scrollY).toBe(0);
    height = 2000;
    nextFrame();
    nextFrame();
    expect(window.scrollY).toBe(760);
    expect(frames.size).toBe(0);
  });

  it('starts new navigation at the top and restores a separate entry on Forward', () => {
    renderNavigation();
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
    fireEvent.scroll(window);
    fireEvent.click(screen.getByText('Open post'));
    expect(window.scrollY).toBe(0);
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });
    fireEvent.click(screen.getByText('Back'));
    nextFrame();
    nextFrame();
    expect(window.scrollY).toBe(900);
    fireEvent.click(screen.getByText('Forward'));
    nextFrame();
    nextFrame();
    expect(window.scrollY).toBe(120);
  });

  it('cancels deferred restoration when the user scrolls', () => {
    renderNavigation();
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
    fireEvent.click(screen.getByText('Open post'));
    height = 400;
    fireEvent.click(screen.getByText('Back'));
    nextFrame();
    fireEvent.wheel(window);
    height = 3000;
    nextFrame();
    expect(window.scrollY).toBe(0);
    expect(frames.size).toBe(0);
  });

  it('clears previous session positions and pending restoration on account reset', () => {
    renderNavigation();
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
    fireEvent.click(screen.getByText('Open post'));
    height = 400;
    fireEvent.click(screen.getByText('Back'));
    act(() => resetSessionStores());
    expect(frames.size).toBe(0);
    height = 3000;
    fireEvent.click(screen.getByText('Open post'));
    fireEvent.click(screen.getByText('Back'));
    nextFrame();
    expect(window.scrollY).toBe(0);
  });
});
