import { fireEvent, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProfileSafetyMenu } from '../ProfileSafetyMenu';

const state = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/entities/chat', () => ({ useUserBlockStatus: () => ({ blockedByMe: false }) }));
vi.mock('@/features/chat', () => ({
  useBlockUser: () => ({ mutate: state.mutate, isPending: false }),
  useUnblockUser: () => ({ mutate: vi.fn(), isPending: false }),
  ReportConversationModal: () => <div role="dialog" aria-label="Report profile" />,
}));

describe('Profile safety actions', () => {
  it('requires confirmation and retains recoverable block errors', async () => {
    state.mutate.mockImplementation((_id: string, options: { onError: () => void }) =>
      options.onError(),
    );
    renderWithProviders(<ProfileSafetyMenu userId="target" username="alice" />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for @alice' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Block account' }));
    const dialog = screen.getByRole('dialog', { name: 'Block @alice?' });
    expect(state.mutate).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Block account' }));
    expect(state.mutate).toHaveBeenCalledWith('target', expect.any(Object));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not update');
    expect(dialog).toBeVisible();
  });
});
