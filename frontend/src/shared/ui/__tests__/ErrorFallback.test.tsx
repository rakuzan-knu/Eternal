import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorFallback } from '../ErrorFallback';

describe('ErrorFallback', () => {
  it('renders error message and reloads page on button click', () => {
    const resetErrorMock = vi.fn();
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(<ErrorFallback error={new Error('Boom')} resetError={resetErrorMock} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    fireEvent.click(reloadButton);

    expect(resetErrorMock).toHaveBeenCalled();
    expect(reloadMock).toHaveBeenCalled();
  });
});
