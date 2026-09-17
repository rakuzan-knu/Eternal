import React from 'react';
import { MapPin } from 'lucide-react';
import Toggle from '@/shared/ui/Toggle';
import { usePrivacy, useUpdatePrivacy } from '../../model/usePrivacy';

export default function NearbyRecommendationsToggle() {
  const { data: privacy } = usePrivacy();
  const updatePrivacy = useUpdatePrivacy();

  const allowNearby = privacy?.allowNearbyRecommendations ?? true;

  const handleToggle = () => {
    updatePrivacy.mutate({ allowNearbyRecommendations: !allowNearby });
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/10 border border-white/15 text-blue-400">
          <MapPin size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Show me in nearby recommendations</h3>
          <p className="mt-1 text-xs text-gray-400 leading-relaxed">
            Allow users nearby and in your city to discover your profile in Suggested for you. Your
            exact location is never shared.
          </p>
        </div>
        <Toggle
          checked={allowNearby}
          onChange={handleToggle}
          aria-label="Show in nearby recommendations"
        />
      </div>
    </div>
  );
}
