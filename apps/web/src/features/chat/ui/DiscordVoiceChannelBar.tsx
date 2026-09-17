import React from 'react';
import { Mic, MicOff, Headphones, PhoneOff, Radio, Users } from 'lucide-react';

export interface DiscordVoiceChannelBarProps {
  roomName: string;
  peerCount: number;
  isMuted: boolean;
  isDeafened: boolean;
  isLocalSpeaking: boolean;
  speakingPeerCount: number;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnect: () => void;
}

export function DiscordVoiceChannelBar({
  roomName,
  peerCount,
  isMuted,
  isDeafened,
  isLocalSpeaking,
  speakingPeerCount,
  onToggleMute,
  onToggleDeafen,
  onDisconnect,
}: DiscordVoiceChannelBarProps) {
  return (
    <div
      data-testid="discord-voice-channel-bar"
      className="flex items-center justify-between px-4 py-2 bg-[#11121d] border-b border-emerald-500/20 text-xs select-none animate-fadeIn"
    >
      {/* Left: Status & Room details */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 shrink-0">
          <Radio
            size={14}
            className={
              speakingPeerCount > 0 || isLocalSpeaking ? 'animate-pulse text-emerald-300' : ''
            }
          />
          {(speakingPeerCount > 0 || isLocalSpeaking) && (
            <span className="absolute -inset-0.5 rounded-full border border-emerald-400 animate-ping opacity-60 pointer-events-none" />
          )}
        </div>

        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-emerald-400 tracking-wide">Voice Connected</span>
            <span className="text-gray-500 text-[10px] font-mono">/ P2P Mesh (UDP)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 truncate">
            <span className="truncate max-w-36 text-gray-300 font-medium">{roomName}</span>
            <span className="flex items-center gap-0.5 text-gray-500 shrink-0">
              <Users size={11} />
              <span>{peerCount + 1}</span>
            </span>
            <span className="text-[10px] text-emerald-500/80 font-mono">~15ms latency</span>
          </div>
        </div>
      </div>

      {/* Right: Controls (Mute, Deafen, Disconnect) */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Mute Button */}
        <button
          type="button"
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        {/* Deafen Button */}
        <button
          type="button"
          onClick={onToggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen (Mute Output)'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            isDeafened
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Headphones size={15} className={isDeafened ? 'line-through' : ''} />
        </button>

        {/* Disconnect Button */}
        <button
          type="button"
          onClick={onDisconnect}
          title="Disconnect from Voice Room"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600/80 text-white hover:bg-red-500 transition-colors shadow-sm ml-1 cursor-pointer"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
}
