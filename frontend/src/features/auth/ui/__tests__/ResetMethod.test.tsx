import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetMethod } from '../ResetMethod';
import { FoundUserResponse } from '../../model/types';

const user1: FoundUserResponse = {
  id: 'usr_1',
  name: 'Alex Kovalenko',
  role: 'Eternal User',
  emoji: '⚡',
  src: null,
  maskedEmail: 'a••••@test.com',
  maskedPhone: '+••••••••32',
};

describe('ResetMethod', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the matched user's name and role", () => {
    render(<ResetMethod user={user1} onCancel={vi.fn()} />);

    expect(screen.getByText('Alex Kovalenko')).toBeInTheDocument();
    expect(screen.getByText('Eternal User')).toBeInTheDocument();
  });

  it('renders the masked email and phone options', () => {
    render(<ResetMethod user={user1} onCancel={vi.fn()} />);

    expect(screen.getByText(/a••••@test.com/)).toBeInTheDocument();
    expect(screen.getByText(/\+••••••••32/)).toBeInTheDocument();
  });

  it('defaults to the email option being selected', () => {
    render(<ResetMethod user={user1} onCancel={vi.fn()} />);

    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
  });

  it('switches to the SMS option when its radio is clicked', async () => {
    const user = userEvent.setup();
    render(<ResetMethod user={user1} onCancel={vi.fn()} />);

    await user.click(screen.getAllByRole('radio')[1]);

    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it('alerts with the masked email when sending the code via email (default)', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ResetMethod user={user1} onCancel={vi.fn()} />);

    await user.click(screen.getByText('Continue'));

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('a••••@test.com'));
  });

  it('alerts with the masked phone when sending the code via SMS', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ResetMethod user={user1} onCancel={vi.fn()} />);
    await user.click(screen.getAllByRole('radio')[1]);

    await user.click(screen.getByText('Continue'));

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('+••••••••32'));
  });

  it('calls onCancel when "Isn\'t that you?" is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<ResetMethod user={user1} onCancel={onCancel} />);

    await user.click(screen.getByText("Isn't that you?"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders the default avatar placeholder when the user has no src', () => {
    const userWithoutAvatar: FoundUserResponse = { ...user1, src: null };

    const { container } = render(<ResetMethod user={userWithoutAvatar} onCancel={vi.fn()} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
