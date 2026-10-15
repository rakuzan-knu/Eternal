import React, { useState, useEffect } from 'react';
import { Activity, Users, Settings, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SlideOverPanel from '@/shared/ui/SlideOverPanel';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { familyApi } from '../../api/familyApi';
import { FamilyMembersResponse } from '../../model/familyCenterTypes';
import { FamilyActivityTab } from './FamilyActivityTab';
import { MyFamilyTab } from './MyFamilyTab';
import { FamilySettingsTab } from './FamilySettingsTab';

export type FamilyCenterTabId = 'activity' | 'my-family' | 'settings';

interface FamilyCenterPanelProps {
  onClose: () => void;
  initialTab?: FamilyCenterTabId;
  isClosing?: boolean;
}

export const FamilyCenterPanel: React.FC<FamilyCenterPanelProps> = ({
  onClose,
  initialTab = 'activity',
  isClosing,
}) => {
  const { data: currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<FamilyCenterTabId>(initialTab);

  // Dev-only role override (strictly disabled in production)
  const [devRoleOverride, setDevRoleOverride] = useState<'parent' | 'child' | null>(null);

  // Calculate age from user's registration birthDate
  const userAge = React.useMemo(() => {
    if (!currentUser?.birthDate) return 25; // default adult
    const birth = new Date(currentUser.birthDate);
    if (isNaN(birth.getTime())) return 25;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }, [currentUser?.birthDate]);

  // Server state for family members
  const [membersData, setMembersData] = useState<FamilyMembersResponse>({
    role: userAge >= 18 ? 'parent' : 'child',
    connectedChildren: [],
    connectedParents: [],
    maxChildren: 8,
    maxParents: 2,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = React.useCallback(async () => {
    try {
      const res = await familyApi.getMembers();
      setMembersData(res);
    } catch (err) {
      console.error('Failed to load family members:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Determine active effective role
  const effectiveRole = devRoleOverride ?? (userAge >= 18 ? 'parent' : 'child');
  const isTeen = effectiveRole === 'child';

  const tabs: { id: FamilyCenterTabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'activity',
      label: 'Activity',
      icon: <Activity size={14} className="text-gray-950 dark:text-white" />,
    },
    {
      id: 'my-family',
      label: 'My Family',
      icon: <Users size={14} className="text-gray-950 dark:text-white" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={14} className="text-gray-950 dark:text-white" />,
    },
  ];

  return (
    <SlideOverPanel title="Account / Family Center" onClose={onClose} isClosing={isClosing}>
      <div className="flex flex-col gap-5 p-2 sm:p-4 text-gray-950 dark:text-white max-w-2xl mx-auto">
        {/* User Role Badge */}
        <div className="flex items-center px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-gray-600 dark:text-gray-300">
              Your role:{' '}
              <strong className="text-gray-950 dark:text-white">
                {isTeen ? 'Teen' : 'Parent'}
              </strong>
            </span>
          </div>
        </div>

        {/* 3-Tab Selector with Framer Motion Sliding Pill (matching Profile widget switcher) */}
        <div className="glass-panel relative flex items-center p-1 rounded-2xl border border-black/10 dark:border-white/8 shadow-inner">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors z-10 cursor-pointer ${
                  isActive
                    ? 'text-gray-950 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFamilyCenterTab"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    className="absolute inset-0 rounded-xl bg-white shadow-sm border border-black/10 dark:bg-white/[0.14] dark:border-white/20 dark:shadow-md"
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents with AnimatePresence */}
        <AnimatePresence initial={false}>
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <FamilyActivityTab
                isTeen={isTeen}
                onNavigateToMyFamily={() => setActiveTab('my-family')}
              />
            </motion.div>
          )}

          {activeTab === 'my-family' && (
            <motion.div
              key="my-family"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <MyFamilyTab
                isTeen={isTeen}
                connectedChildren={membersData.connectedChildren}
                connectedParents={membersData.connectedParents}
                maxChildren={membersData.maxChildren}
                maxParents={membersData.maxParents}
                onRefreshMembers={fetchMembers}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <FamilySettingsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SlideOverPanel>
  );
};

export default FamilyCenterPanel;
