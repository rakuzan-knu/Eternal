import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileHeader from '../ProfileHeader';

describe('ProfileHeader', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the username with an @ prefix', () => {
    render(<ProfileHeader username="ayate" onEditClick={vi.fn()} />);

    expect(screen.getByText('@ayate')).toBeInTheDocument();
  });

  it('calls onEditClick exactly once when the edit button is clicked', async () => {
    const onEditClick = vi.fn();
    const user = userEvent.setup();
    render(<ProfileHeader username="ayate" onEditClick={onEditClick} />);

    await user.click(screen.getByText('Редагувати'));

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it('shows a follower count alert when the followers count is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfileHeader username="ayate" onEditClick={vi.fn()} />);

    await user.click(screen.getByText('підписників'));

    expect(window.alert).toHaveBeenCalledWith('Вікно підписників');
  });

  it('shows a following count alert when the following count is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfileHeader username="ayate" onEditClick={vi.fn()} />);

    await user.click(screen.getByText('підписок'));

    expect(window.alert).toHaveBeenCalledWith('Вікно підписок');
  });

  it('does not call onEditClick when only the followers count is clicked', async () => {
    const onEditClick = vi.fn();
    const user = userEvent.setup();
    render(<ProfileHeader username="ayate" onEditClick={onEditClick} />);

    await user.click(screen.getByText('підписників'));

    expect(onEditClick).not.toHaveBeenCalled();
  });
});
