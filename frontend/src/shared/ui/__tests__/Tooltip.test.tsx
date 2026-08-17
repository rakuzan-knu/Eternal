import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Tooltip from '../Tooltip';

describe('Tooltip', () => {
  it('renders children trigger element', () => {
    render(
      <Tooltip label="Helpful tip">
        <button>Hover me</button>
      </Tooltip>,
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
    expect(screen.queryByText('Helpful tip')).not.toBeInTheDocument();
  });

  it('shows tooltip portal on mouse enter and hides on mouse leave', async () => {
    render(
      <Tooltip label="Helpful tip" position="top">
        <button>Hover me</button>
      </Tooltip>,
    );

    const trigger = screen.getByText('Hover me').parentElement!;
    fireEvent.mouseEnter(trigger);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Helpful tip')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);

    await vi.waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
