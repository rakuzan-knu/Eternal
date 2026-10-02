import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { familyApi } from '../api/familyApi';
import { FamilyCenterSettings } from './familyCenterTypes';

interface FamilySettingsState extends FamilyCenterSettings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<FamilyCenterSettings>) => Promise<void>;
}

export const useFamilySettingsStore = create<FamilySettingsState>()(
  persist(
    (set, get) => ({
      weeklyDigest: true,
      newFriendAlerts: true,
      reportAlerts: true,
      notifyLinkRequests: true,
      pinEnabled: false,
      pinCode: '',
      isLoaded: false,

      loadSettings: async () => {
        try {
          const remote = await familyApi.getSettings();
          if (remote) {
            set({ ...remote, isLoaded: true });
          }
        } catch {
          set({ isLoaded: true });
        }
      },

      updateSettings: async (patch) => {
        set(patch);
        try {
          await familyApi.updateSettings(patch);
        } catch (err) {
          console.error('Failed to sync family settings to backend:', err);
        }
      },
    }),
    {
      name: 'family-settings-storage',
      partialize: (state) => ({
        weeklyDigest: state.weeklyDigest,
        newFriendAlerts: state.newFriendAlerts,
        reportAlerts: state.reportAlerts,
        notifyLinkRequests: state.notifyLinkRequests,
        pinEnabled: state.pinEnabled,
        pinCode: state.pinCode,
      }),
    },
  ),
);
