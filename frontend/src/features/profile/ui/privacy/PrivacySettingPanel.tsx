import SlideOverPanel from '@/shared/ui/SlideOverPanel';
import RadioGroup from '@/shared/ui/RadioGroup';
import type { RadioOption } from '@/shared/ui/RadioGroup';
import { usePrivacy, useUpdatePrivacy } from '../../model/usePrivacy';
import { DIMENSION_TO_KEY } from '../../model/privacyTypes';
import type { PrivacyDimension, Visibility } from '../../model/privacyTypes';
import PreviewCard from './PreviewCard';
import ExceptionPicker from './ExceptionPicker';

interface PrivacySettingPanelProps {
  dimension: PrivacyDimension;
  title: string;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: RadioOption<Visibility>[] = [
  { value: 'EVERYBODY', label: 'Everybody' },
  { value: 'CONTACTS', label: 'My followers', description: 'People who follow you.' },
  { value: 'NOBODY', label: 'Nobody' },
];

export default function PrivacySettingPanel({
  dimension,
  title,
  onClose,
}: PrivacySettingPanelProps) {
  const { data: privacy } = usePrivacy();
  const updatePrivacy = useUpdatePrivacy();

  const key = DIMENSION_TO_KEY[dimension];
  const value: Visibility = privacy ? privacy[key] : 'EVERYBODY';

  const setValue = (next: Visibility) => {
    if (next === value) return;
    updatePrivacy.mutate({ [key]: next });
  };

  return (
    <SlideOverPanel title={title} onClose={onClose}>
      <div className="flex flex-col gap-5 pb-4">
        <PreviewCard dimension={dimension} value={value} />

        <section>
          <h3 className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Who can see this
          </h3>
          <RadioGroup value={value} options={VISIBILITY_OPTIONS} onChange={setValue} />
        </section>

        <section>
          <h3 className="px-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400/80">
            Always share with
          </h3>
          <p className="px-1 mb-2 text-xs text-gray-500">
            These people always see this, ignoring the setting above.
          </p>
          <ExceptionPicker dimension={dimension} mode="ALLOW" />
        </section>

        <section>
          <h3 className="px-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-400/80">
            Never share with
          </h3>
          <p className="px-1 mb-2 text-xs text-gray-500">
            These people never see this, even if the setting allows it.
          </p>
          <ExceptionPicker dimension={dimension} mode="DENY" />
        </section>
      </div>
    </SlideOverPanel>
  );
}
