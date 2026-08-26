import React, { useState } from 'react';
import { ChevronDown, Sparkles, Edit3 } from 'lucide-react';
import { MessageView } from '../../../entities/chat/model/types';
import Avatar from '@/shared/ui/Avatar';

interface SystemMessageClusterProps {
  messages: MessageView[];
  onOpenEditGroup?: () => void;
}

function getClusterTitle(count: number): string {
  return count === 1 ? '1 group change' : `${count} group changes`;
}

function formatMessageTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isLeaveSystemMessage(msg: MessageView): boolean {
  if (msg.messageType !== 'SYSTEM') return false;
  const body = msg.body || '';
  return body.includes('left the group') || body.includes('left the conversation');
}

export default function SystemMessageCluster({
  messages,
  onOpenEditGroup,
}: SystemMessageClusterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (messages.length === 0) return null;

  // Single system message
  if (messages.length === 1) {
    const msg = messages[0];

    if (isLeaveSystemMessage(msg)) {
      return (
        <div className="flex justify-center my-2.5 px-4 select-none">
          <span className="text-center text-xs text-gray-400 font-normal leading-relaxed">
            {msg.body}
          </span>
        </div>
      );
    }

    return (
      <div className="flex justify-center my-2 select-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181926]/90 border border-white/10 shadow-lg backdrop-blur-md text-xs text-purple-200">
          <Edit3 size={13} className="text-purple-400 shrink-0" />
          <span>{msg.body}</span>
          <button
            type="button"
            onClick={() => {
              if (onOpenEditGroup) onOpenEditGroup();
              else window.dispatchEvent(new CustomEvent('open-edit-group'));
            }}
            className="text-purple-400 hover:text-purple-300 font-semibold hover:underline transition ml-1 cursor-pointer"
          >
            Edit group
          </button>
          <span className="text-[10px] text-gray-400 ml-1.5 font-mono">
            {formatMessageTime(msg.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // Collect unique user avatars in cluster
  const uniqueUsers: Array<{ id: string; name: string; avatar: string | null }> = [];
  const seenIds = new Set<string>();

  messages.forEach((m) => {
    if (m.sender && !seenIds.has(m.sender.id)) {
      seenIds.add(m.sender.id);
      uniqueUsers.push({
        id: m.sender.id,
        name: m.sender.displayName || m.sender.username,
        avatar: m.sender.avatar,
      });
    }
  });

  return (
    <div className="flex flex-col items-center my-2 select-none w-full max-w-lg mx-auto">
      {/* Collapsed Capsule with Interactive Micro-Avatar Stack */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="system-message-cluster-toggle"
        className="group inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#161724]/95 border border-purple-500/30 hover:border-purple-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-xs text-purple-200 hover:text-white transition-all active:scale-95 cursor-pointer"
        title="Click to view details"
      >
        <Sparkles
          size={13}
          className="text-purple-400 group-hover:rotate-12 transition-transform"
        />

        {/* Micro-Avatar Stack */}
        {uniqueUsers.length > 0 && (
          <div className="flex items-center -space-x-2">
            {uniqueUsers.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="ring-2 ring-[#161724] rounded-full overflow-hidden shrink-0"
              >
                <Avatar
                  src={user.avatar}
                  name={user.name}
                  size="xs"
                  className="w-[18px] h-[18px] rounded-full"
                />
              </div>
            ))}
          </div>
        )}

        <span className="font-semibold">{getClusterTitle(messages.length)}</span>

        <ChevronDown
          size={14}
          className={`text-purple-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Accordion Details */}
      {isExpanded && (
        <div className="flex flex-col gap-1.5 w-full mt-2 animate-slideDown">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-center justify-between px-3.5 py-1.5 rounded-2xl bg-[#181926]/90 border border-white/10 backdrop-blur-md text-xs text-purple-200 shadow-md"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Edit3 size={12} className="text-purple-400 shrink-0" />
                <span className="truncate">{msg.body}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenEditGroup) onOpenEditGroup();
                    else window.dispatchEvent(new CustomEvent('open-edit-group'));
                  }}
                  className="text-purple-400 hover:text-purple-300 font-semibold hover:underline transition cursor-pointer"
                >
                  Edit
                </button>
                <span className="text-[10px] text-gray-400 font-mono">
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
