import { useId, useRef } from 'react';
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
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export default function RadioGroup<T extends string>({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: RadioGroupProps<T>) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className="flex flex-col gap-1"
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            ref={(element) => {
              buttons.current[index] = element;
            }}
            role="radio"
            aria-checked={active}
            aria-labelledby={`${id}-${index}-label`}
            aria-describedby={opt.description ? `${id}-${index}-description` : undefined}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(event) => {
              let nextIndex: number;
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                nextIndex = (index + 1) % options.length;
              else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
                nextIndex = (index - 1 + options.length) % options.length;
              else if (event.key === 'Home') nextIndex = 0;
              else if (event.key === 'End') nextIndex = options.length - 1;
              else return;
              event.preventDefault();
              buttons.current[nextIndex]?.focus();
              onChange(options[nextIndex].value);
            }}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-(--eternal-radius-control) text-left transition-colors duration-(--eternal-motion-duration-fast) ${
              active ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <span className="min-w-0">
              <span id={`${id}-${index}-label`} className="block text-sm font-medium text-white">
                {opt.label}
              </span>
              {opt.description && (
                <span
                  id={`${id}-${index}-description`}
                  className="block text-xs text-gray-400 mt-0.5"
                >
                  {opt.description}
                </span>
              )}
            </span>
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                active ? 'bg-white border-white text-black' : 'border-white/25 text-transparent'
              }`}
            >
              <Check aria-hidden="true" size={13} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
