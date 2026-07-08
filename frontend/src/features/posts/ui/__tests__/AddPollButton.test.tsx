import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddPollButton } from '../AddPollButton';

describe('AddPollButton', () => {
  it('renders in the closed (inactive) state by default styling', () => {
    render(<AddPollButton isOpen={false} onToggle={vi.fn()} />);

    const button = screen.getByTitle('Створити опитування');
    expect(button).not.toHaveClass('bg-white/10');
  });

  it('renders in the open (active) state styling when isOpen is true', () => {
    render(<AddPollButton isOpen={true} onToggle={vi.fn()} />);

    const button = screen.getByTitle('Створити опитування');
    expect(button).toHaveClass('bg-white/10');
  });

  it('calls onToggle exactly once per click', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<AddPollButton isOpen={false} onToggle={onToggle} />);

    await user.click(screen.getByTitle('Створити опитування'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle twice when clicked twice in a row', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<AddPollButton isOpen={false} onToggle={onToggle} />);
    const button = screen.getByTitle('Створити опитування');

    await user.click(button);
    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
