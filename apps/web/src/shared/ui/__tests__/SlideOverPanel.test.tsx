import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SlideOverPanel from '../SlideOverPanel';
import { SettingsPanelHost } from '../SettingsPanelHost';

describe('SlideOverPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title and children and closes on back button or Escape key', () => {
    const onClose = vi.fn();
    render(
      <SlideOverPanel title="Panel Title" onClose={onClose}>
        <div>Panel content</div>
      </SlideOverPanel>,
    );

    expect(screen.getByText('Panel Title')).toBeInTheDocument();
    expect(screen.getByText('Panel content')).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    // Rapid duplicate click while closing
    fireEvent.click(backButton);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <SlideOverPanel title="Panel Title" onClose={onClose}>
        <div>Content</div>
      </SlideOverPanel>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('renders inside host element when host context is provided', () => {
    render(
      <SettingsPanelHost>
        <SlideOverPanel title="Hosted Panel" onClose={vi.fn()} headerRight={<button>Save</button>}>
          <div>Inside Host</div>
        </SlideOverPanel>
      </SettingsPanelHost>,
    );

    expect(screen.getByText('Hosted Panel')).toBeInTheDocument();
    expect(screen.getByText('Inside Host')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
