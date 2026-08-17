import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AttachMenu from '../AttachMenu';

describe('AttachMenu', () => {
  it('opens popup menu on trigger click and displays options', () => {
    const onPickMedia = vi.fn();
    const onPickFile = vi.fn();
    const onTogglePoll = vi.fn();

    render(
      <AttachMenu
        isGroup={true}
        onPickMedia={onPickMedia}
        onPickFile={onPickFile}
        onTogglePoll={onTogglePoll}
      />,
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByText('Photo or video')).toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Poll')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Poll'));
    expect(onTogglePoll).toHaveBeenCalled();
  });
});
