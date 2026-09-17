import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface FilterOption {
  key: string;
  label: string;
}

export const BlogFilterBar: React.FC<{
  selectedCategory: string;
  onSelectCategory: (categoryKey: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: FilterOption[];
  searchPlaceholder: string;
}> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  categories,
  searchPlaceholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize key for matching aliases
  const normKey = (k: string) => {
    const lower = (k || '').toLowerCase();
    if (lower === 'policy' || lower === 'policysafety' || lower === 'policy-safety')
      return 'safety';
    if (lower === 'howto' || lower === 'howtoeternal' || lower === 'how_to_eternal')
      return 'how-to-eternal';
    if (lower === 'productfeatures' || lower === 'product-features') return 'product';
    return lower;
  };

  const currentNorm = normKey(selectedCategory);

  const selectedOption =
    categories.find((c) => normKey(c.key) === currentNorm) ||
    categories.find((c) => c.key === selectedCategory) ||
    categories[0];

  const selectedLabel = selectedOption?.label || 'Featured';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto rounded-full bg-white text-black p-1.5 sm:p-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-center justify-between gap-2 z-30 relative select-none">
      {/* Category Dropdown Pill */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full hover:bg-neutral-100 font-bold text-xs sm:text-sm text-neutral-800 transition-colors cursor-pointer"
        >
          <span className="truncate max-w-[130px] sm:max-w-[180px]">{selectedLabel}</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 text-neutral-500 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu Modal (Opens Upwards) */}
        {isOpen && (
          <div className="absolute bottom-full left-0 mb-3 w-56 rounded-2xl bg-white border border-neutral-200 shadow-[0_-15px_40px_rgba(0,0,0,0.35)] p-2 flex flex-col gap-1 z-50 animate-fadeIn">
            {categories.map((cat) => {
              const isSelected = normKey(cat.key) === currentNorm || cat.key === selectedCategory;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50 text-purple-700 font-extrabold'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span>{cat.label}</span>
                  {isSelected && <Check size={14} className="text-purple-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-neutral-300" />

      {/* Search Input */}
      <div className="flex-1 flex items-center gap-2 pr-4">
        <Search size={16} className="text-neutral-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-xs sm:text-sm font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none"
        />
      </div>
    </div>
  );
};
