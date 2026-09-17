import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ImageEditorModal from '../ImageEditorModal';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) => (
    <button data-testid="mock-emoji-item" onClick={() => onEmojiClick({ emoji: '🔥' })}>
      Pick Fire Emoji
    </button>
  ),
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

describe('ImageEditorModal', () => {
  const mockFile = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
  const originalImage = window.Image;

  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-photo'),
      revokeObjectURL: vi.fn(),
    });

    // Mock Image with synchronous onload
    window.Image = class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
      get src() {
        return this._src;
      }
    } as any;

    const rect = {
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    };
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue(rect);

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
    });

    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((cb) => {
      cb(new Blob(['edited'], { type: 'image/png' }));
    });
  });

  afterEach(() => {
    window.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('initializes and renders the full editor UI after image loads', async () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();

    render(
      <ImageEditorModal
        file={mockFile}
        initialSpoiler={false}
        onCancel={onCancel}
        onSave={onSave}
      />,
    );

    expect(screen.getByText('Loading image…')).toBeInTheDocument();

    // Wait for image onload
    const doneBtn = await screen.findByText('Done');
    expect(doneBtn).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Toggle spoiler
    const spoilerBtn = screen.getByTitle(/Hide under spoiler/i);
    fireEvent.click(spoilerBtn);

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('handles tool modes: Draw, Sticker, and Text', async () => {
    render(<ImageEditorModal file={mockFile} onCancel={vi.fn()} onSave={vi.fn()} />);

    await screen.findByText('Done');

    // Switch to Sticker mode
    fireEvent.click(screen.getByText('Sticker'));
    expect(screen.getByText(/Pick an emoji/)).toBeInTheDocument();

    // Open emoji picker and select
    const chooseEmojiBtn = screen.getByText('Choose emoji');
    fireEvent.click(chooseEmojiBtn);

    const emojiItem = await screen.findByTestId('mock-emoji-item');
    fireEvent.click(emojiItem);

    // Switch to Text mode
    fireEvent.click(screen.getByText('Text'));
    expect(screen.getByText(/Click on the image to add text/)).toBeInTheDocument();

    // Switch back to Draw mode
    fireEvent.click(screen.getByText('Draw'));
    expect(screen.getByTitle('Pencil')).toBeInTheDocument();
    expect(screen.getByTitle('Marker')).toBeInTheDocument();
    expect(screen.getByTitle('Eraser')).toBeInTheDocument();
  });

  it('executes mirror, rotate, and done saving', async () => {
    const onSave = vi.fn();
    render(<ImageEditorModal file={mockFile} onCancel={vi.fn()} onSave={onSave} />);

    const doneBtn = await screen.findByText('Done');

    fireEvent.click(screen.getByTitle('Mirror 180°'));
    fireEvent.click(screen.getByTitle('Rotate 90°'));

    fireEvent.click(doneBtn);
    expect(onSave).toHaveBeenCalledWith(expect.any(File), false);
  });

  it('creates, edits, and commits text draft on canvas', async () => {
    const onSave = vi.fn();
    const { container } = render(
      <ImageEditorModal file={mockFile} onCancel={vi.fn()} onSave={onSave} />,
    );

    await screen.findByText('Done');

    // Switch to Text mode
    fireEvent.click(screen.getByText('Text'));

    const canvas = container.querySelector('canvas');
    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    }

    const textarea = screen.getByPlaceholderText('Type text...');
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Awesome caption' } });

    // Commit by clicking Done
    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    expect(onSave).toHaveBeenCalled();
  });
});
