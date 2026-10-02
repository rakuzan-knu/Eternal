import React, { useState } from 'react';
import { Check, AlertTriangle, ChevronDown, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SlideOverPanel from '@/shared/ui/SlideOverPanel';
import Avatar from '@/shared/ui/Avatar';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';

export type ReputationTier =
  | 'good' // 0: Good
  | 'limited' // 1: Limited
  | 'very_limited' // 2: Very Limited
  | 'at_risk' // 3: At Risk
  | 'suspended'; // 4: Suspended

export interface ViolationRecord {
  id: string;
  ruleTitle: string;
  description?: string;
  timestamp: string;
  isExpired: boolean;
}

interface AccountReputationPanelProps {
  onClose: () => void;
  tier?: ReputationTier;
  violations?: ViolationRecord[];
  isClosing?: boolean;
}

const STAGES: { id: ReputationTier; label: string; color: string }[] = [
  { id: 'good', label: 'Good', color: '#23a55a' },
  { id: 'limited', label: 'Limited', color: '#f0b232' },
  { id: 'very_limited', label: 'Very Limited', color: '#f26522' },
  { id: 'at_risk', label: 'At Risk', color: '#f23f43' },
  { id: 'suspended', label: 'Suspended', color: '#da373c' },
];

export const AccountReputationPanel: React.FC<AccountReputationPanelProps> = ({
  onClose,
  tier = 'good',
  violations = [],
  isClosing,
}) => {
  const { data: currentUser } = useCurrentUser();

  const [isActiveAccordionOpen, setIsActiveAccordionOpen] = useState(false);
  const [isExpiredAccordionOpen, setIsExpiredAccordionOpen] = useState(false);

  const stageIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.id === tier),
  );
  const currentStageConfig = STAGES[stageIndex] || STAGES[0];

  const activeViolations = violations.filter((v) => !v.isExpired);
  const expiredViolations = violations.filter((v) => v.isExpired);

  return (
    <SlideOverPanel title="Account / Account Reputation" onClose={onClose} isClosing={isClosing}>
      <div className="flex flex-col gap-5 p-2 sm:p-4 text-gray-950 dark:text-white animate-fadeIn max-w-2xl mx-auto">
        {/* 1. Header Profile & Reputation Status Card */}
        <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/[0.06]">
          <div className="relative shrink-0">
            <Avatar
              src={currentUser?.avatar || null}
              size="xl"
              alt={currentUser?.displayName || 'User'}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full ring-2 ring-black/10 dark:ring-white/10 shadow-md"
            />
            {tier === 'good' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#23a55a] border-2 border-white dark:border-[#1e1f22] flex items-center justify-center text-white shadow-xs">
                <Check size={13} className="stroke-[3]" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white leading-snug">
              Your account status is{' '}
              <span
                style={{ color: currentStageConfig.color }}
                className="font-bold drop-shadow-xs"
              >
                {tier === 'good'
                  ? 'in good standing'
                  : tier === 'limited'
                    ? 'limited'
                    : tier === 'very_limited'
                      ? 'very limited'
                      : tier === 'at_risk'
                        ? 'at risk'
                        : 'suspended'}
              </span>
            </h3>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-0.5">
              {tier === 'good' ? (
                <>
                  Thank you for following our{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-[#00a8fc] hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/guidelines"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-[#00a8fc] hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Community Guidelines
                  </a>
                  . Any policy violations will be documented here.
                </>
              ) : (
                <>
                  Please follow our{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-[#00a8fc] hover:underline font-semibold"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/guidelines"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-[#00a8fc] hover:underline font-semibold"
                  >
                    Community Guidelines
                  </a>
                  . Repeated violations may result in further restrictions.
                </>
              )}
            </p>
          </div>
        </div>

        {/* 2. Dynamic 5-Stage Reputation Status Timeline */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/[0.06] flex flex-col gap-4">
          <div className="relative flex items-center justify-between px-4 sm:px-8 mt-2 mb-1">
            {/* Background Line */}
            <div className="absolute left-6 right-6 sm:left-10 sm:right-10 top-1/2 -translate-y-1/2 h-1 bg-black/10 dark:bg-white/10 rounded-full z-0" />

            {/* Active Colored Line */}
            <div
              className="absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 h-1 rounded-full z-0 transition-all duration-500"
              style={{
                width: `calc(${(stageIndex / (STAGES.length - 1)) * 100}% - 10px)`,
                backgroundColor: currentStageConfig.color,
              }}
            />

            {STAGES.map((stage, idx) => {
              const isPast = idx < stageIndex;
              const isCurrent = idx === stageIndex;

              return (
                <div key={stage.id} className="relative z-10 flex flex-col items-center">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm"
                    style={{
                      backgroundColor: isCurrent || isPast ? stage.color : '#2b2d31',
                      boxShadow: isCurrent ? `0 0 16px ${stage.color}90` : 'none',
                      border: isCurrent
                        ? '2px solid white'
                        : isPast
                          ? `2px solid ${stage.color}`
                          : '2px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    {isCurrent && stage.id === 'good' ? (
                      <Check size={14} className="text-white stroke-[3]" />
                    ) : isCurrent ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    ) : isPast ? (
                      <Check size={12} className="text-white stroke-[2.5]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline Labels */}
          <div className="grid grid-cols-5 gap-1 pt-1">
            {STAGES.map((stage, idx) => {
              const isCurrent = idx === stageIndex;
              return (
                <span
                  key={stage.id}
                  className={`text-[10px] sm:text-[11px] leading-tight text-center transition-colors ${
                    isCurrent
                      ? 'font-bold text-gray-950 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 font-medium'
                  }`}
                >
                  {stage.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* 3. Accordion 1: Active Violations */}
        <div className="rounded-2xl border border-black/8 dark:border-white/[0.06] overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setIsActiveAccordionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={17} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-gray-950 dark:text-white">
                  Active Violations: {activeViolations.length}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Affect your account standing until they expire.
                </span>
              </div>
            </div>

            <ChevronDown
              size={18}
              className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ml-2 ${
                isActiveAccordionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {isActiveAccordionOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-black/6 dark:border-white/[0.04]"
              >
                <div className="p-4 flex flex-col gap-3">
                  {activeViolations.length === 0 ? (
                    <div className="py-6 px-4 text-center rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1">
                        <ShieldCheck size={20} />
                      </div>
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-200">
                        Your account currently has no active violations.
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Thank you for keeping our community safe and respectful!
                      </p>
                    </div>
                  ) : (
                    activeViolations.map((v) => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-xl bg-[#1e1f22] border border-white/8 flex flex-col gap-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-gray-400">
                            {v.timestamp}
                          </span>
                          <span className="text-[10px] text-amber-400 font-semibold">Active</span>
                        </div>
                        <p className="text-xs font-bold text-white mt-0.5">
                          Violated rule:{' '}
                          <span className="text-white font-extrabold">{v.ruleTitle}</span>.
                        </p>
                        {v.description && (
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            {v.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Accordion 2: Expired Violations */}
        <div className="rounded-2xl border border-black/8 dark:border-white/[0.06] overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setIsExpiredAccordionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-gray-500/10 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={17} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-gray-950 dark:text-white">
                  Expired Violations: {expiredViolations.length}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  No longer impact your account standing.
                </span>
              </div>
            </div>

            <ChevronDown
              size={18}
              className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ml-2 ${
                isExpiredAccordionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {isExpiredAccordionOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-black/6 dark:border-white/[0.04]"
              >
                <div className="p-4 flex flex-col gap-3">
                  {expiredViolations.length === 0 ? (
                    <div className="py-5 px-4 text-center text-xs text-gray-500 dark:text-gray-400 italic">
                      Your account has no expired violations.
                    </div>
                  ) : (
                    expiredViolations.map((v) => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.02] border border-black/6 dark:border-white/6 flex flex-col gap-1"
                      >
                        <span className="text-[10px] text-gray-500 font-medium">{v.timestamp}</span>
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {v.ruleTitle} (expired)
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SlideOverPanel>
  );
};

export default AccountReputationPanel;
