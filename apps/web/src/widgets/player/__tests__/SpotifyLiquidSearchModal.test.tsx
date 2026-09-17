import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpotifyLiquidSearchModal } from '../SpotifyLiquidSearchModal';

describe('SpotifyLiquidSearchModal', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input when isOpen is true', () => {
    render(<SpotifyLiquidSearchModal isOpen={true} onClose={onCloseMock} />);

    expect(screen.getByPlaceholderText(/Search tracks/i)).toBeInTheDocument();
    expect(screen.getByText('ESC')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<SpotifyLiquidSearchModal isOpen={false} onClose={onCloseMock} />);

    expect(screen.queryByPlaceholderText(/Search tracks/i)).not.toBeInTheDocument();
  });

  it('calls onClose when clicking ESC button or backdrop', () => {
    render(<SpotifyLiquidSearchModal isOpen={true} onClose={onCloseMock} />);

    const escBtn = screen.getByText('ESC');
    fireEvent.click(escBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
