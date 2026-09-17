import React from 'react';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react';
import { useCall } from '../../model/CallContext';
import type { CallLogMetadata, UserSnapshot } from '@common/contracts';

export interface CallHistoryMessage {
  id: string;
  conversationId: string;
  body: string | null;
  messageType: string;
  sender: UserSnapshot;
  createdAt?: Date | string;
}

interface CallHistoryItemProps {
  message: CallHistoryMessage;
  currentUserId: string | null;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function CallHistoryItem({ message, currentUserId }: CallHistoryItemProps) {
  const { initiateCall } = useCall();

  let metadata: Partial<CallLogMetadata> = {};
  if (message.body) {
    if (typeof message.body === 'object' && message.body !== null) {
      metadata = message.body as unknown as CallLogMetadata;
    } else if (typeof message.body === 'string') {
      try {
        metadata = JSON.parse(message.body) as CallLogMetadata;
      } catch {
        // fallback if body is plain string
      }
    }
  }

  const isOutgoing = Boolean(message.sender?.id && message.sender.id === currentUserId);
  const isMissed = metadata.status === 'MISSED';
  const isDeclined = metadata.status === 'DECLINED';
  const rawCallType =
    metadata.callType || (message as unknown as { callType?: string }).callType || '';
  const isVideo = String(rawCallType).toUpperCase() === 'VIDEO';

  const getCallIcon = () => {
    if (isVideo) {
      return <Video size={16} className={isMissed ? 'text-rose-400' : 'text-indigo-400'} />;
    }
    if (isMissed) {
      return <PhoneMissed size={16} className="text-rose-400" />;
    }
    if (isOutgoing) {
      return <PhoneOutgoing size={16} className="text-blue-400" />;
    }
    return <PhoneIncoming size={16} className="text-emerald-400" />;
  };

  const getTitle = () => {
    const typeLabel = isVideo ? 'Video call' : 'Voice call';
    if (isMissed) return `Missed ${typeLabel.toLowerCase()}`;
    if (isDeclined) return `Declined ${typeLabel.toLowerCase()}`;
    return typeLabel;
  };

  const getSubtitle = () => {
    if (isMissed || isDeclined) {
      return isOutgoing ? 'No answer' : 'Missed';
    }
    if (metadata.durationMs) {
      return formatDuration(metadata.durationMs);
    }
    return 'Call ended';
  };

  const handleCallBack = () => {
    const targetUser = message.sender || {
      id: '',
      username: 'User',
      displayName: 'User',
      avatar: null,
      isOnline: false,
    };
    initiateCall({
      conversationId: message.conversationId,
      callType: isVideo ? 'video' : 'audio',
      remoteUser: targetUser,
    });
  };

  return (
    <div className="flex justify-center my-3 w-full">
      <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg max-w-sm">
        {/* Call Icon Capsule */}
        <div
          className={`w-9 h-9 flex items-center justify-center rounded-xl ${
            isMissed ? 'bg-rose-500/10' : 'bg-white/10'
          }`}
        >
          {getCallIcon()}
        </div>

        {/* Call Details */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white tracking-wide truncate">{getTitle()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{getSubtitle()}</p>
        </div>

        {/* Call Back Action */}
        <button
          onClick={handleCallBack}
          title="Call back"
          aria-label="Call back"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          <Phone size={13} />
          <span>Call back</span>
        </button>
      </div>
    </div>
  );
}
