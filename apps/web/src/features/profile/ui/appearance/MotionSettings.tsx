import { useVisualEffects, type MotionPreference } from '@/shared/model/useVisualEffects';

const options: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'Use device setting' },
  { value: 'full', label: 'Full animations' },
  { value: 'reduced', label: 'Reduced motion' },
];

export function MotionSettings() {
  const motion = useVisualEffects((state) => state.motion);
  const setMotion = useVisualEffects((state) => state.setMotion);
  return (
    <fieldset className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
      <legend className="px-1 text-sm font-semibold">Interface motion</legend>
      <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
        Choose how loading waves, menus and transitions move on this device.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, label }) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name="interface-motion"
              value={value}
              checked={motion === value}
              onChange={() => setMotion(value)}
              className="peer sr-only"
            />
            <span className="block rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-medium transition-colors peer-checked:border-violet-500 peer-checked:bg-violet-500/15 peer-checked:text-violet-700 dark:peer-checked:text-violet-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-violet-500">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
