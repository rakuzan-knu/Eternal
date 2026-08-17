import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageEditorModal from '../ImageEditorModal';

describe('ImageEditorModal', () => {
  const mockFile = new File(['image-bytes'], 'test.png', { type: 'image/png' });

  it('renders loading state initially while canvas initializes', () => {
    render(<ImageEditorModal file={mockFile} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByText('Loading image…')).toBeInTheDocument();
  });
});
