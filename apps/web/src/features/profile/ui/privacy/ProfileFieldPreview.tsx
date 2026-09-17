import { Lock, EyeOff } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import type { PrivacyDimension, Visibility } from '../../model/privacyTypes';
import { strangerLabel } from './strangerLabel';

interface ProfileFieldPreviewProps {
  dimension: PrivacyDimension;
  hidden: boolean;
  value: Visibility;
  currentUser:
    | {
        displayName?: string;
        username?: string;
        avatar?: string | null;
        banner?: string | null;
        bio?: string | null;
      }
    | undefined;
}

export default function ProfileFieldPreview({
  dimension,
  hidden,
  value,
  currentUser,
}: ProfileFieldPreviewProps) {
  const who = value === 'CONTACTS' ? 'subscribers' : 'others';

  return (
    <div>
      <p className="text-sm font-medium text-white mb-3">How {who} see it</p>
      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        {dimension === 'BANNER' && (
          <div className="h-20 w-full bg-[#111]">
            {!hidden && currentUser?.banner ? (
              <img src={currentUser.banner} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                {hidden ? <Lock size={18} /> : <EyeOff size={18} />}
              </div>
            )}
          </div>
        )}

        <div className="p-4 flex items-center gap-3">
          {dimension === 'AVATAR' && hidden ? (
            <span className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-gray-500">
              <Lock size={16} />
            </span>
          ) : (
            <Avatar src={currentUser?.avatar} size="md" alt={currentUser?.displayName} />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {currentUser?.displayName || currentUser?.username}
            </p>
            {dimension === 'BIO' ? (
              hidden ? (
                <p className="text-xs text-gray-500 italic mt-0.5">Hidden profile description</p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {currentUser?.bio || 'No profile description available.'}
                </p>
              )
            ) : (
              <p className="text-xs text-gray-500">@{currentUser?.username}</p>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 leading-relaxed">
        {strangerLabel(dimension, value)}
      </p>
    </div>
  );
}
