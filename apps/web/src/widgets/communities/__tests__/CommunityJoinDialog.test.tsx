import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityJoinDialog } from '../CommunityJoinDialog';
import { invitationTokenFromInput } from '../invitationLink';
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));
vi.mock('../CommunityManagement', () => ({ communityButton: 'button', communityInput: 'input' }));
describe('invitation link entry', () => {
  beforeEach(() => vi.clearAllMocks());
  it('accepts only a complete invitation path or token and never follows a pasted host', () => {
    const token = 'a'.repeat(43);
    expect(invitationTokenFromInput(`https://untrusted.test/invite/${token}`)).toBe(token);
    expect(invitationTokenFromInput(token)).toBe(token);
    expect(invitationTokenFromInput('javascript:alert(1)')).toBeNull();
    expect(invitationTokenFromInput('https://untrusted.test/other')).toBeNull();
  });
  it('previews internally before any membership change', () => {
    const close = vi.fn();
    const token = 'a'.repeat(43);
    render(<CommunityJoinDialog onClose={close} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Invitation link' }), {
      target: { value: `https://untrusted.test/invite/${token}` },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview invitation' }));
    expect(navigate).toHaveBeenCalledWith(`/invite/${token}`);
    expect(close).toHaveBeenCalledOnce();
  });
  it('retains invalid input and focuses the named field with an associated error', () => {
    render(<CommunityJoinDialog onClose={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Invitation link' });
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview invitation' }));
    expect(screen.getByRole('alert')).toHaveTextContent('complete invitation');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('invalid');
    expect(navigate).not.toHaveBeenCalled();
  });
});
