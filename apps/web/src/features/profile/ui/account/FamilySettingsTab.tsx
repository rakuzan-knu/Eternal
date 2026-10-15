import React, { useState, useEffect } from 'react';
import { Mail, Bell, ShieldAlert, KeyRound, Check } from 'lucide-react';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { useFamilySettingsStore } from '../../model/useFamilySettingsStore';
import { familyApi } from '../../api/familyApi';

interface FamilySettingsTabProps {
  accentColor?: string;
}

export const FamilySettingsTab: React.FC<FamilySettingsTabProps> = ({ accentColor }) => {
  const isGlass = useThemeStore(
    (s) => s.isGlassmorphismEnabled || s.glassmorphismOpacity > 0 || s.themeMode === 'wallpaper',
  );
  const {
    weeklyDigest,
    newFriendAlerts,
    reportAlerts,
    notifyLinkRequests,
    pinEnabled,
    pinCode,
    loadSettings,
    updateSettings,
  } = useFamilySettingsStore();

  const [isSaved, setIsSaved] = useState(false);

  // Load from server on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const cardBaseStyle = isGlass
    ? 'glass-card border-white/10 shadow-lg'
    : 'bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/[0.06] shadow-xs';

  const rowBaseStyle = isGlass
    ? 'border-b border-white/5'
    : 'border-b border-black/5 dark:border-white/[0.06]';

  const triggerAutoSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggleWeeklyDigest = () => {
    const nextVal = !weeklyDigest;
    updateSettings({ weeklyDigest: nextVal });
    familyApi.updateSettings({ weeklyDigest: nextVal }).catch(() => {});
    triggerAutoSave();
  };

  const handleToggleFriendAlerts = () => {
    const nextVal = !newFriendAlerts;
    updateSettings({ newFriendAlerts: nextVal });
    familyApi.updateSettings({ newFriendAlerts: nextVal }).catch(() => {});
    triggerAutoSave();
  };

  const handleToggleReportAlerts = () => {
    const nextVal = !reportAlerts;
    updateSettings({ reportAlerts: nextVal });
    familyApi.updateSettings({ reportAlerts: nextVal }).catch(() => {});
    triggerAutoSave();
  };

  const handleToggleNotifyLinkRequests = () => {
    const nextVal = !notifyLinkRequests;
    updateSettings({ notifyLinkRequests: nextVal });
    familyApi.updateSettings({ notifyLinkRequests: nextVal }).catch(() => {});
    triggerAutoSave();
  };

  const handleTogglePin = () => {
    const nextVal = !pinEnabled;
    updateSettings({ pinEnabled: nextVal });
    familyApi.updateSettings({ pinEnabled: nextVal }).catch(() => {});
    triggerAutoSave();
  };

  return (
    <div className="flex flex-col gap-5 animate-fadeIn pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white">
            Family Center Settings
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Manage notifications, activity digests, and security preferences for all family members.
          </p>
        </div>

        {/* Quiet Auto-save indicator */}
        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 text-xs font-semibold animate-fadeIn shrink-0">
            <Check size={14} className="stroke-[2.5]" />
            <span>Settings saved</span>
          </div>
        )}
      </div>

      <div className={`rounded-2xl overflow-hidden border ${cardBaseStyle}`}>
        {/* Row 1: Weekly digest */}
        <div className={`flex items-center justify-between p-4 ${rowBaseStyle}`}>
          <div className="flex items-center gap-3.5 pr-3">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-gray-950 dark:text-white">
              <Mail size={18} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-gray-950 dark:text-white">
                Weekly Email Digest
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Receive a weekly activity summary of your teen's account every Monday.
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={weeklyDigest}
            onClick={handleToggleWeeklyDigest}
            style={{
              backgroundColor: weeklyDigest ? accentColor || '#5865F2' : undefined,
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              weeklyDigest ? '' : 'bg-black/20 dark:bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                weeklyDigest ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Row 2: New friend alerts */}
        <div className={`flex items-center justify-between p-4 ${rowBaseStyle}`}>
          <div className="flex items-center gap-3.5 pr-3">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-gray-950 dark:text-white">
              <Bell size={18} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-gray-950 dark:text-white">
                New Friend Alerts
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Instant in-app notification whenever your teen connects with a new friend.
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={newFriendAlerts}
            onClick={handleToggleFriendAlerts}
            style={{
              backgroundColor: newFriendAlerts ? accentColor || '#5865F2' : undefined,
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              newFriendAlerts ? '' : 'bg-black/20 dark:bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                newFriendAlerts ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Row 3: Report alerts */}
        <div className={`flex items-center justify-between p-4 ${rowBaseStyle}`}>
          <div className="flex items-center gap-3.5 pr-3">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-gray-950 dark:text-white">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-gray-950 dark:text-white">
                Report & Safety Alerts
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Get notified if your teen submits a report to moderators or encounters safety
                incidents.
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={reportAlerts}
            onClick={handleToggleReportAlerts}
            style={{
              backgroundColor: reportAlerts ? accentColor || '#5865F2' : undefined,
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              reportAlerts ? '' : 'bg-black/20 dark:bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                reportAlerts ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Row 4: Notify on incoming link requests */}
        <div className={`flex items-center justify-between p-4 ${rowBaseStyle}`}>
          <div className="flex items-center gap-3.5 pr-3">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-gray-950 dark:text-white">
              <Check size={18} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-gray-950 dark:text-white">
                Connection Request Alerts
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Receive alerts and push notifications when a teen requests to link accounts.
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={notifyLinkRequests}
            onClick={handleToggleNotifyLinkRequests}
            style={{
              backgroundColor: notifyLinkRequests ? accentColor || '#5865F2' : undefined,
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              notifyLinkRequests ? '' : 'bg-black/20 dark:bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                notifyLinkRequests ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Row 5: PIN Code Protection */}
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 pr-3">
              <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-gray-950 dark:text-white">
                <KeyRound size={18} />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-gray-950 dark:text-white">
                  Parental PIN Code
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Require a 4-digit PIN before modifying safety limits or disconnecting accounts.
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={pinEnabled}
              onClick={handleTogglePin}
              style={{
                backgroundColor: pinEnabled ? accentColor || '#5865F2' : undefined,
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                pinEnabled ? '' : 'bg-black/20 dark:bg-white/20'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  pinEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {pinEnabled && (
            <div className="flex items-center gap-3 pl-12 pt-2">
              <input
                type="password"
                maxLength={4}
                placeholder="PIN"
                value={pinCode || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  updateSettings({ pinCode: val });
                  triggerAutoSave();
                }}
                className="w-24 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-center font-mono tracking-widest text-sm text-gray-950 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Enter 4 digits</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilySettingsTab;
