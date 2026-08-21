import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toggle from '../Toggle';

describe('Toggle', () => {
  it('renders switch role and handles checked states', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Toggle checked={false} onChange={onChange} aria-label="Dark mode" />,
    );

    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(<Toggle checked={true} onChange={onChange} aria-label="Dark mode" />);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('respects disabled prop', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} disabled={true} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();

    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });
});
