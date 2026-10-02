import React, { useState } from 'react';
import { Shield, Clock, MessageSquare, CreditCard, Lock, Check, X } from 'lucide-react';
import { familyApi } from '../../api/familyApi';
import { FamilySafeguardsDto } from '../../model/familyCenterTypes';

interface FamilySafeguardsModalProps {
  childId: string;
  childName: string;
  safeguards?: FamilySafeguardsDto;
  onClose: () => void;
  onUpdated?: () => void;
  accentColor?: string;
  textOnAccent?: string;
}

export const FamilySafeguardsModal: React.FC<FamilySafeguardsModalProps> = ({
  childId,
  childName,
  safeguards,
  onClose,
  onUpdated,
  accentColor,
  textOnAccent,
}) => {
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(safeguards?.dailyLimitMinutes ?? 120);
  const [curfewStart, setCurfewStart] = useState(safeguards?.curfewStart ?? '22:00');
  const [curfewEnd, setCurfewEnd] = useState(safeguards?.curfewEnd ?? '07:00');
  const [restrictedDMs, setRestrictedDMs] = useState(safeguards?.restrictedDirectMessages ?? true);
  const [monthlyBudget, setMonthlyBudget] = useState(safeguards?.monthlyBudget ?? 50);
  const [requireApproval, setRequireApproval] = useState(
    safeguards?.requirePurchaseApproval ?? true,
  );
  const [profileLocked, setProfileLocked] = useState(safeguards?.profileLockedByParent ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await familyApi.updateSafeguards(childId, {
        dailyLimitMinutes,
        curfewStart,
        curfewEnd,
        curfewTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        restrictedDirectMessages: restrictedDMs,
        monthlyBudget,
        requirePurchaseApproval: requireApproval,
        profileLockedByParent: profileLocked,
      });
      setSavedSuccess(true);
      onUpdated?.();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to update safeguards:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#111214] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Safeguards & Safety Limits</h3>
              <p className="text-xs text-gray-400">Managing profile: {childName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Screen Time & Curfew */}
        <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 text-sm font-bold text-white">
            <Clock size={16} className="text-white" />
            <span>Screen Time & Downtime</span>
          </div>

          {/* Daily limit slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Daily limit:</span>
              <span className="font-bold text-white">
                {Math.floor(dailyLimitMinutes / 60)}h {dailyLimitMinutes % 60}m
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={360}
              step={15}
              value={dailyLimitMinutes}
              onChange={(e) => setDailyLimitMinutes(Number(e.target.value))}
              style={{ accentColor: accentColor || '#5865F2' }}
              className="w-full cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
          </div>

          {/* Curfew times */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Downtime start (evening):</label>
              <input
                type="time"
                value={curfewStart}
                onChange={(e) => setCurfewStart(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Downtime end (morning):</label>
              <input
                type="time"
                value={curfewEnd}
                onChange={(e) => setCurfewEnd(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Direct Messages filter */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <MessageSquare size={18} className="text-white shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Stranger Message Protection</div>
              <div className="text-[11px] text-gray-400">
                Allow direct messages only from mutual friends
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={restrictedDMs}
            onClick={() => setRestrictedDMs(!restrictedDMs)}
            style={{
              backgroundColor: restrictedDMs ? accentColor || '#5865F2' : undefined,
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              restrictedDMs ? '' : 'bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                restrictedDMs ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3. Spending Limit & Push Approval */}
        <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 text-sm font-bold text-white">
            <CreditCard size={16} className="text-white" />
            <span>Spending Limits & Purchases</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Monthly in-app budget:</span>
              <span className="font-bold text-white">${monthlyBudget}</span>
            </div>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Number(e.target.value))}
              style={{ accentColor: accentColor || '#5865F2' }}
              className="w-full cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <div>
              <div className="text-xs font-semibold text-white">
                Purchase Approval Notifications
              </div>
              <div className="text-[11px] text-gray-400">
                Require parental approval for each in-app transaction
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={requireApproval}
              onClick={() => setRequireApproval(!requireApproval)}
              style={{
                backgroundColor: requireApproval ? accentColor || '#5865F2' : undefined,
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                requireApproval ? '' : 'bg-white/20'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  requireApproval ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 4. Profile Privacy Lock */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-white shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Lock Privacy Settings</div>
              <div className="text-[11px] text-gray-400">
                Prevent teen from disabling safety filters independently
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={profileLocked}
            onClick={() => setProfileLocked(!profileLocked)}
            style={{
              backgroundColor: profileLocked ? accentColor || '#5865F2' : undefined,
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              profileLocked ? '' : 'bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                profileLocked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{ backgroundColor: accentColor || '#5865F2', color: textOnAccent || '#ffffff' }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check size={15} />
                <span>Saved</span>
              </>
            ) : isSaving ? (
              <span>Saving...</span>
            ) : (
              <span>Apply Safeguards</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamilySafeguardsModal;
