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
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              active ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-white">{opt.label}</span>
              {opt.description && (
                <span className="block text-xs text-gray-500 mt-0.5">{opt.description}</span>
              )}
            </span>
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                active ? 'bg-white border-white text-black' : 'border-white/25 text-transparent'
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
