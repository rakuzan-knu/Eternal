import { Clock, Forward, Phone, Mic, MessageSquare, Cake, Users, Lock } from 'lucide-react';
import type { PrivacyDimension, Visibility } from '../../model/privacyTypes';
import { strangerLabel } from './strangerLabel';

const ICONS: Partial<Record<PrivacyDimension, React.ElementType>> = {
  LAST_SEEN: Clock,
  FORWARD_LINK: Forward,
  CALLS: Phone,
  VOICE_MESSAGES: Mic,
  MESSAGES: MessageSquare,
  BIRTHDAY: Cake,
  GROUP_INVITES: Users,
};

interface GenericPreviewProps {
  dimension: PrivacyDimension;
  value: Visibility;
  hidden: boolean;
}

export default function GenericPreview({ dimension, value, hidden }: GenericPreviewProps) {
  const Icon = ICONS[dimension] ?? Clock;
  return (
    <div className="flex items-start gap-3">
      <span
        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-colors ${
          hidden
            ? 'bg-white/5 border-white/10 text-gray-500'
            : 'bg-white/10 border-white/15 text-white'
        }`}
      >
        {hidden ? <Lock size={17} /> : <Icon size={17} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
          How {value === 'CONTACTS' ? 'subscribers' : 'others'} see it
        </p>
        <p className="mt-1 text-xs text-gray-400 leading-relaxed">
          {strangerLabel(dimension, value)}
        </p>
      </div>
    </div>
  );
}
