import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Music, Timer, Lock, CheckCircle2 } from 'lucide-react';

export const InteractivePrivacyDemo: React.FC = () => {
  const [ghostMode, setGhostMode] = useState(true);
  const [richPresence, setRichPresence] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(true);
  const [autoDelete, setAutoDelete] = useState<'off' | '24h' | '7d'>('24h');

  return (
    <div className="interactive-demo my-8 p-6 rounded-3xl bg-gradient-to-br from-[#140e2b] via-[#0f0b21] to-[#120e29] border border-purple-600/35 shadow-[0_0_40px_rgba(139,92,246,0.15)] relative overflow-hidden">
      {/* Decorative top badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-purple-800/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Interactive Privacy Controls Sandbox</h4>
            <p className="text-[11px] text-purple-300/80">
              Test how Eternal enforces your data isolation settings live
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Zero Knowledge Enforcement</span>
        </div>
      </div>

      {/* Grid of Interactive Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle 1: Ghost Mode */}
        <div className="p-4 rounded-2xl bg-[#1b1338]/60 border border-purple-800/40 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-900/40 text-purple-300 mt-0.5">
              {ghostMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Ghost Mode</span>
              <p className="text-[10px] text-neutral-400">
                {ghostMode
                  ? 'Last seen & online status completely hidden'
                  : 'Visible to accepted followers'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGhostMode(!ghostMode)}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${
              ghostMode ? 'bg-purple-600' : 'bg-neutral-800'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                ghostMode ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Spotify Rich Presence */}
        <div className="p-4 rounded-2xl bg-[#1b1338]/60 border border-purple-800/40 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-900/40 text-emerald-300 mt-0.5">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Music Rich Presence</span>
              <p className="text-[10px] text-neutral-400">
                {richPresence ? 'Broadcast current Spotify track' : 'Listening activity hidden'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRichPresence(!richPresence)}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${
              richPresence ? 'bg-emerald-600' : 'bg-neutral-800'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                richPresence ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 3: Private Account */}
        <div className="p-4 rounded-2xl bg-[#1b1338]/60 border border-purple-800/40 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-900/40 text-indigo-300 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Private Profile (Feed)</span>
              <p className="text-[10px] text-neutral-400">
                {privateAccount
                  ? 'Posts only visible to approved friends'
                  : 'Public to all network'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPrivateAccount(!privateAccount)}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${
              privateAccount ? 'bg-indigo-600' : 'bg-neutral-800'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                privateAccount ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 4: Disappearing Messages */}
        <div className="p-4 rounded-2xl bg-[#1b1338]/60 border border-purple-800/40 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-900/40 text-amber-300 mt-0.5">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Auto-Delete Messages</span>
              <p className="text-[10px] text-neutral-400">Purge chat history after duration</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#120c24] p-1 rounded-xl border border-purple-900/40">
            {(['off', '24h', '7d'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setAutoDelete(period)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  autoDelete === period
                    ? 'bg-purple-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simulated Live Privacy State Badge */}
      <div className="mt-5 p-3 rounded-xl bg-[#0c081a] border border-purple-900/40 text-xs text-neutral-300 flex items-center justify-between">
        <span className="text-purple-300 font-semibold">Active State:</span>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-purple-900/40 text-purple-200 border border-purple-500/30">
            Ghost: {ghostMode ? 'ENABLED' : 'DISABLED'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-200 border border-indigo-500/30">
            Feed: {privateAccount ? 'PRIVATE' : 'PUBLIC'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
            Music: {richPresence ? 'BROADCASTING' : 'HIDDEN'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-900/40 text-amber-200 border border-amber-500/30">
            Chat Retention: {autoDelete.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};
