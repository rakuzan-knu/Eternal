import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
  onBlur?: () => void;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, onChange, options, className = '', onBlur }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useImperativeHandle(ref, () => buttonRef.current!);

    useEffect(() => {
      if (isOpen) {
        const currentIndex = options.indexOf(value);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
    }, [isOpen, value, options]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          onBlur?.();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onBlur]);

    useEffect(() => {
      if (isOpen && listRef.current && highlightedIndex >= 0) {
        const activeItem = listRef.current.children[highlightedIndex] as HTMLElement;
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [highlightedIndex, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!isOpen) {
        if (['ArrowDown', 'ArrowUp', ' ', 'Enter'].includes(e.key)) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % options.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onChange(options[highlightedIndex]);
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case 'Tab':
          setIsOpen(false);
          onBlur?.();
          break;
        default:
          break;
      }
    };

    return (
      <div className={`relative w-full ${className}`} ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="w-full flex items-center justify-between bg-neutral-900/50 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-purple-500 transition-all duration-200"
        >
          <span>{value}</span>
          <ChevronDown
            size={16}
            className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-400' : ''}`}
          />
        </button>

        {isOpen && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 left-0 w-full mt-1.5 max-h-60 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl text-sm text-neutral-300 custom-scrollbar animate-fadeIn"
          >
            {options.map((option, index) => {
              const isSelected = value === option;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`px-3.5 py-2.5 cursor-pointer transition-colors duration-150 text-left first:rounded-t-xl last:rounded-b-xl
                    ${isSelected ? 'bg-purple-500/20 text-purple-400 font-medium' : ''}
                    ${isHighlighted && !isSelected ? 'bg-neutral-900 text-neutral-100' : ''}
                    ${!isHighlighted && !isSelected ? 'hover:bg-neutral-900/50 hover:text-neutral-100' : ''}
                  `}
                >
                  {option}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
