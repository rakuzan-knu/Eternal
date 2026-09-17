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

  it('triggers file selection for media and file inputs', () => {
    const onPickMedia = vi.fn();
    const onPickFile = vi.fn();
    const onTogglePoll = vi.fn();

    const { container } = render(
      <AttachMenu
        isGroup={false}
        onPickMedia={onPickMedia}
        onPickFile={onPickFile}
        onTogglePoll={onTogglePoll}
      />,
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Media click
    const mediaItem = screen.getByText('Photo or video');
    fireEvent.click(mediaItem);

    const inputs = container.querySelectorAll('input[type="file"]');
    const mediaInput = inputs[0] as HTMLInputElement;
    const fileInput = inputs[1] as HTMLInputElement;

    const testFile1 = new File(['img'], 'pic.jpg', { type: 'image/jpeg' });
    fireEvent.change(mediaInput, { target: { files: [testFile1] } });
    expect(onPickMedia).toHaveBeenCalledWith([testFile1]);

    // Open again for File click
    fireEvent.click(trigger);
    const fileItem = screen.getByText('File');
    fireEvent.click(fileItem);

    const testFile2 = new File(['doc'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [testFile2] } });
    expect(onPickFile).toHaveBeenCalledWith([testFile2]);
  });

  it('closes on outside click', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <AttachMenu
          isGroup={true}
          onPickMedia={vi.fn()}
          onPickFile={vi.fn()}
          onTogglePoll={vi.fn()}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));
    expect(screen.getByText('Photo or video')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Photo or video')).not.toBeInTheDocument();
  });

  it('disables restricted options when canSendMedia or canSendPolls is false', () => {
    render(
      <AttachMenu
        isGroup={true}
        canSendMedia={false}
        canSendPolls={false}
        onPickMedia={vi.fn()}
        onPickFile={vi.fn()}
        onTogglePoll={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));
    const restrictedLabels = screen.getAllByText('Restricted');
    expect(restrictedLabels.length).toBe(3);
  });
});
