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
    (set) => ({
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
        const remote = await familyApi.updateSettings(patch);
        set({ ...remote, pinCode: '' });
      },
    }),
    {
      name: 'family-settings-storage',
      version: 1,
      migrate: (persisted) => {
        const data = typeof persisted === 'object' && persisted !== null ? persisted : {};
        return {
          weeklyDigest: 'weeklyDigest' in data && data.weeklyDigest === true,
          newFriendAlerts: 'newFriendAlerts' in data && data.newFriendAlerts === true,
          reportAlerts: 'reportAlerts' in data && data.reportAlerts === true,
          notifyLinkRequests: 'notifyLinkRequests' in data && data.notifyLinkRequests === true,
          pinEnabled: false,
          pinCode: '',
        };
      },
      partialize: (state) => ({
        weeklyDigest: state.weeklyDigest,
        newFriendAlerts: state.newFriendAlerts,
        reportAlerts: state.reportAlerts,
        notifyLinkRequests: state.notifyLinkRequests,
        pinEnabled: state.pinEnabled,
      }),
    },
  ),
);
