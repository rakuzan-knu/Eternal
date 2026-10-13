import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddPollButton } from '../AddPollButton';

describe('AddPollButton', () => {
  it('exposes a closed poll editor as an unpressed toggle', () => {
    render(<AddPollButton isOpen={false} onToggle={vi.fn()} />);

    const button = screen.getByTitle('Create poll');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('exposes an open poll editor as a pressed toggle', () => {
    render(<AddPollButton isOpen={true} onToggle={vi.fn()} />);

    const button = screen.getByTitle('Create poll');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle exactly once per click', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<AddPollButton isOpen={false} onToggle={onToggle} />);

    await user.click(screen.getByTitle('Create poll'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle twice when clicked twice in a row', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<AddPollButton isOpen={false} onToggle={onToggle} />);
    const button = screen.getByTitle('Create poll');

    await user.click(button);
    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
