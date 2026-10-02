import { Check } from 'lucide-react';

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface RadioGroupProps<T extends string> {
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
}

export default function RadioGroup<T extends string>({
  value,
  options,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
              active ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-950 dark:text-white">
                {opt.label}
              </span>
              {opt.description && (
                <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {opt.description}
                </span>
              )}
            </span>
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                active
                  ? 'bg-gray-950 border-gray-950 text-white dark:bg-white dark:border-white dark:text-black'
                  : 'border-black/20 dark:border-white/25 text-transparent'
              }`}
            >
              <Check size={13} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
