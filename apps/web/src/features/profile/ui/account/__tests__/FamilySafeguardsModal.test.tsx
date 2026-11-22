import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FamilySafeguardsModal } from '../FamilySafeguardsModal';
import { FamilySettingsTab } from '../FamilySettingsTab';
import { familyApi } from '../../../api/familyApi';
import { useLanguageStore } from '@/shared/lib/language/languageStore';
import { useFamilySettingsStore } from '../../../model/useFamilySettingsStore';

vi.mock('../../../api/familyApi', () => ({
  familyApi: { updateSafeguards: vi.fn(), getSettings: vi.fn(), updateSettings: vi.fn() },
}));

describe('Family safeguards availability and failure states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ currentLanguage: 'English' });
    vi.mocked(familyApi.getSettings).mockResolvedValue({
      weeklyDigest: true,
      newFriendAlerts: true,
      reportAlerts: true,
      notifyLinkRequests: true,
      pinEnabled: false,
      pinCode: '',
    });
  });

  it('keeps unavailable purchase controls disabled and exposes a recoverable save error', async () => {
    vi.mocked(familyApi.updateSafeguards).mockRejectedValue(new Error('Synthetic failure'));
    const onClose = vi.fn();
    render(
      <FamilySafeguardsModal childId="synthetic-child" childName="Fixture" onClose={onClose} />,
    );
    const purchases = screen.getByRole('group', { name: 'Purchases unavailable' });
    expect(within(purchases).getByRole('slider')).toBeDisabled();
    expect(within(purchases).getByRole('switch')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Safeguards' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save safeguards'),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Apply Safeguards' })).toBeEnabled();
  });

  it('explains unavailable email and PIN protection in Ukrainian without enabling a false control', async () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    render(<FamilySettingsTab />);
    expect(screen.getByText(/захист PIN ще недоступні/)).toBeInTheDocument();
    for (const control of screen.getAllByRole('switch')) expect(control).toBeDisabled();
    expect(familyApi.updateSettings).not.toHaveBeenCalled();
  });

  it('removes a legacy cleartext PIN during local preference migration', async () => {
    localStorage.setItem(
      'family-settings-storage',
      JSON.stringify({
        version: 0,
        state: { weeklyDigest: true, pinEnabled: true, pinCode: '9753' },
      }),
    );
    await useFamilySettingsStore.persist.rehydrate();
    expect(useFamilySettingsStore.getState().pinCode).toBe('');
    expect(localStorage.getItem('family-settings-storage')).not.toContain('9753');
    expect(localStorage.getItem('family-settings-storage')).not.toContain('pinCode');
  });
});
