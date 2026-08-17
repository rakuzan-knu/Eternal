import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatFolderIcon from '../ChatFolderIcon';

describe('ChatFolderIcon', () => {
  it('renders emoji directly when emoji is provided', () => {
    render(<ChatFolderIcon iconKey={null} emoji="🔥" color="#ff0000" />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('renders icon component when iconKey is provided', () => {
    const { container } = render(<ChatFolderIcon iconKey="folder" emoji={null} color="#3b82f6" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
