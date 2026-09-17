import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatDropzoneOverlay from '../ChatDropzoneOverlay';

describe('ChatDropzoneOverlay', () => {
  it('does not render when isDragging is false', () => {
    const { container } = render(<ChatDropzoneOverlay isDragging={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dropzone with text when isDragging is true', () => {
    render(<ChatDropzoneOverlay isDragging={true} />);
    expect(screen.getByText('Drop files here to send')).toBeInTheDocument();
    expect(screen.getByTestId('chat-dropzone-overlay')).toBeInTheDocument();
  });
});
