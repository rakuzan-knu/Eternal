import { useLanguageStore } from '@/shared/lib/language/languageStore';
import React, { useEffect } from 'react';
import { Mail, Bell, ShieldAlert, KeyRound, Check } from 'lucide-react';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { useFamilySettingsStore } from '../../model/useFamilySettingsStore';

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
  } = useFamilySettingsStore();

  const ukrainian = useLanguageStore((state) => state.currentLanguage === 'Українська');

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
      </div>

      <p id="family-preferences-unavailable" className="text-sm text-gray-600 dark:text-gray-400">
        {ukrainian
          ? 'Email-звіти, автоматичні сповіщення та захист PIN ще недоступні. Ці опції вимкнені; вони не підтверджують доставку звернень чи захист змін. Розірвати сімейний зв’язок можна без PIN.'
          : 'Email digests, automatic alerts and PIN protection are not available. These controls are disabled; saved preferences do not confirm delivery or protect changes. Either member can disconnect without a PIN.'}
      </p>
      <fieldset
        disabled
        aria-describedby="family-preferences-unavailable"
        className={`rounded-2xl overflow-hidden border ${cardBaseStyle}`}
      >
        <legend className="sr-only">
          {ukrainian ? 'Недоступні опції' : 'Unavailable preferences'}
        </legend>
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
                Email delivery is not available.
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled
            role="switch"
            aria-label="Weekly email digest"
            aria-checked={weeklyDigest}
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
                Automatic friend alerts are not available.
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled
            role="switch"
            aria-label="New friend alerts"
            aria-checked={newFriendAlerts}
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
            disabled
            role="switch"
            aria-label="Report alerts"
            aria-checked={reportAlerts}
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
            disabled
            role="switch"
            aria-label="Link request alerts"
            aria-checked={notifyLinkRequests}
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
                  PIN protection is not available; account authorization still applies.
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled
              role="switch"
              aria-label="Parental PIN"
              aria-checked={pinEnabled}
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

                className="w-24 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-center font-mono tracking-widest text-sm text-gray-950 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Enter 4 digits</span>
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
};

export default FamilySettingsTab;
