import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageEditorModal from '../ImageEditorModal';

describe('ImageEditorModal (Comprehensive Suite)', () => {
  const mockFile = new File(['dummy-image-bytes'], 'sample.png', { type: 'image/png' });

  beforeEach(() => {
    vi.clearAllMocks();

    const mockContext = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext as any) as any;
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => {
      cb(new Blob(['edited-blob'], { type: 'image/png' }));
    });
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    const originalImage = global.Image;
    global.Image = class extends originalImage {
      constructor() {
        super();
        setTimeout(() => {
          Object.defineProperty(this, 'naturalWidth', { value: 800, configurable: true });
          Object.defineProperty(this, 'naturalHeight', { value: 600, configurable: true });
          this.onload?.(new Event('load'));
        }, 10);
      }
    } as unknown as typeof Image;
  });

  it('renders modal with loaded image canvas and default tools', async () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();

    render(<ImageEditorModal file={mockFile} onCancel={onCancel} onSave={onSave} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading image…')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide under spoiler/i })).toBeInTheDocument();
  });

  it('toggles spoiler button on click', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ImageEditorModal
        file={mockFile}
        onCancel={vi.fn()}
        onSave={vi.fn()}
        initialSpoiler={false}
      />,
    );

    await waitFor(() => expect(screen.queryByText('Loading image…')).not.toBeInTheDocument());

    const spoilerBtn = screen.getByRole('button', { name: /hide under spoiler/i });
    expect(spoilerBtn).toHaveAttribute('title', 'Hide under spoiler: Off');

    await user.click(spoilerBtn);
    expect(spoilerBtn).toHaveAttribute('title', 'Hide under spoiler: On');
  });

  it('switches between Draw, Sticker, and Text tool modes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImageEditorModal file={mockFile} onCancel={vi.fn()} onSave={vi.fn()} />);

    await waitFor(() => expect(screen.queryByText('Loading image…')).not.toBeInTheDocument());

    const stickerBtn = screen.getByRole('button', { name: /sticker/i });
    await user.click(stickerBtn);
    expect(screen.getByText(/pick an emoji/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose emoji/i })).toBeInTheDocument();

    const textBtn = screen.getByRole('button', { name: /text/i });
    await user.click(textBtn);
    expect(screen.getByText(/click on the image to add text/i)).toBeInTheDocument();

    const drawBtn = screen.getByRole('button', { name: /draw/i });
    await user.click(drawBtn);
    expect(screen.getByTitle('Pencil')).toBeInTheDocument();
    expect(screen.getByTitle('Marker')).toBeInTheDocument();
    expect(screen.getByTitle('Eraser')).toBeInTheDocument();
  });

  it('allows selecting different drawing tools and changing brush size/color', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImageEditorModal file={mockFile} onCancel={vi.fn()} onSave={vi.fn()} />);

    await waitFor(() => expect(screen.queryByText('Loading image…')).not.toBeInTheDocument());

    const markerBtn = screen.getByTitle('Marker');
    await user.click(markerBtn);

    const eraserBtn = screen.getByTitle('Eraser');
    await user.click(eraserBtn);

    const sizeSlider = screen.getByRole('slider');
    await user.type(sizeSlider, '{arrowright}{arrowright}');
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onCancel = vi.fn();
    render(<ImageEditorModal file={mockFile} onCancel={onCancel} onSave={vi.fn()} />);

    await waitFor(() => expect(screen.queryByText('Loading image…')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with modified file when Done button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    render(
      <ImageEditorModal file={mockFile} onCancel={vi.fn()} onSave={onSave} initialSpoiler={true} />,
    );

    await waitFor(() => expect(screen.queryByText('Loading image…')).not.toBeInTheDocument());

    const mirrorBtn = screen.getByTitle('Mirror 180°');
    await user.click(mirrorBtn);

    const rotateBtn = screen.getByTitle('Rotate 90°');
    await user.click(rotateBtn);

    await user.click(screen.getByRole('button', { name: /done/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.any(File), true);
  });
});
