import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useThemeStore } from '@/shared/model/useThemeStore';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export type SelectItem = string | SelectOption;

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectItem[];
  icon?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  'aria-label'?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onChange,
      options,
      icon,
      placeholder = 'Select...',
      disabled = false,
      className = '',
      onBlur,
      'aria-label': ariaLabel,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const accentColor = useThemeStore((s) => s.accentColor) || '#5865F2';
    const textOnAccent = useThemeStore((s) => s.textOnAccent) || '#ffffff';

    useImperativeHandle(ref, () => buttonRef.current!);

    const normalizedOptions = useMemo<SelectOption[]>(() => {
      return options.map((opt) => {
        if (typeof opt === 'string') {
          return { value: opt, label: opt };
        }
        return opt;
      });
    }, [options]);

    const selectedOption =
      normalizedOptions.find((opt) => opt.value === value) || normalizedOptions[0];

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          onBlur?.();
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, onBlur]);

    const handleSelect = (val: string) => {
      onChange(val);
      setIsOpen(false);
      buttonRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (normalizedOptions.length > 0) {
          const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
          const nextIndex = (currentIndex + 1) % normalizedOptions.length;
          onChange(normalizedOptions[nextIndex].value);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (normalizedOptions.length > 0) {
          const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
          const prevIndex =
            (currentIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
          onChange(normalizedOptions[prevIndex].value);
        }
      } else if (e.key === 'Tab') {
        setIsOpen(false);
        onBlur?.();
      }
    };

    return (
      <div className={`relative w-full ${className}`} ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-black/10 dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-gray-500'
              : 'bg-black/[0.04] dark:bg-black/40 hover:bg-black/[0.07] dark:hover:bg-black/60 border-black/15 dark:border-white/10 text-gray-900 dark:text-gray-100 shadow-xs'
          }`}
          style={{
            borderColor: isOpen ? accentColor : undefined,
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            {icon && <span className="shrink-0 text-gray-500 dark:text-gray-400">{icon}</span>}
            <span className="truncate text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            style={{
              color: isOpen ? accentColor : undefined,
            }}
          />
        </button>

        {/* Dropdown Menu Popup */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white/95 dark:bg-[#151518]/95 border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-1.5 max-h-64 overflow-y-auto backdrop-blur-xl animate-fadeIn"
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                No options available
              </div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between text-left transition-colors duration-150 cursor-pointer group ${
                      isSelected
                        ? 'bg-black/[0.08] dark:bg-white/[0.08] text-gray-950 dark:text-white font-bold'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {opt.icon && (
                        <span
                          className={`shrink-0 transition-colors ${isSelected ? '' : 'text-gray-500 dark:text-gray-400'}`}
                          style={{ color: isSelected ? accentColor : undefined }}
                        >
                          {opt.icon}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate leading-tight">
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5 leading-tight">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: accentColor, color: textOnAccent }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
