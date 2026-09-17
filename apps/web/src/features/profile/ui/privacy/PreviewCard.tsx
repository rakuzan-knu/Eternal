import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import type { PrivacyDimension, Visibility } from '../../model/privacyTypes';
import GenericPreview from './GenericPreview';
import ProfileFieldPreview from './ProfileFieldPreview';

interface PreviewCardProps {
  dimension: PrivacyDimension;
  value: Visibility;
}

const PROFILE_FIELD_DIMENSIONS: PrivacyDimension[] = ['AVATAR', 'BANNER', 'BIO'];

export default function PreviewCard({ dimension, value }: PreviewCardProps) {
  const { data: currentUser } = useCurrentUser();
  const hidden = value === 'NOBODY';
  const isProfileField = PROFILE_FIELD_DIMENSIONS.includes(dimension);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-white/5">
        Preview
      </div>
      <div key={`${dimension}:${value}`} className="p-5 animate-fadeIn">
        {isProfileField ? (
          <ProfileFieldPreview
            dimension={dimension}
            hidden={hidden}
            value={value}
            currentUser={currentUser}
          />
        ) : (
          <GenericPreview dimension={dimension} value={value} hidden={hidden} />
        )}
      </div>
    </div>
  );
}
