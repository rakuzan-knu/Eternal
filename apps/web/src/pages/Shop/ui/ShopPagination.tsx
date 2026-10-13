import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';

interface ShopPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function getPaginationRange(
  currentPage: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the beginning (matches Discord screenshot 5: 1 2 3 4 5 6 7 ... total)
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 6, 7, 'ellipsis', totalPages];
  }

  // Near the end
  if (currentPage >= totalPages - 4) {
    const range: (number | 'ellipsis')[] = [1, 'ellipsis'];
    for (let i = totalPages - 6; i <= totalPages; i++) {
      range.push(i);
    }
    return range;
  }

  // In the middle
  return [
    1,
    'ellipsis',
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    'ellipsis',
    totalPages,
  ];
}

export function ShopPagination({ currentPage, totalPages, onPageChange }: ShopPaginationProps) {
  const isLight = useThemeStore(isCurrentThemeLight);

  if (totalPages <= 1) return null;

  const range = getPaginationRange(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 sm:gap-2 mt-10 select-none"
    >
      {/* Previous button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={
          'flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ' +
          (currentPage <= 1
            ? 'opacity-35 cursor-not-allowed text-zinc-500'
            : isLight
              ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5'
              : 'text-white/70 hover:text-white hover:bg-white/10')
        }
      >
        <ChevronLeft size={16} />
        <span>Previous</span>
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {range.map((item, index) => {
          if (item === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className={
                  'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm select-none font-semibold ' +
                  (isLight ? 'text-zinc-400' : 'text-white/40')
                }
              >
                …
              </span>
            );
          }

          const isCurrent = item === currentPage;
          return (
            <button
              key={item}
              type="button"
              aria-current={isCurrent ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={
                'w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center transition-all cursor-pointer ' +
                (isCurrent
                  ? 'bg-[#8b5cf6] text-white shadow-md shadow-purple-500/25 scale-105'
                  : isLight
                    ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5'
                    : 'text-white/70 hover:text-white hover:bg-white/10')
              }
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={
          'flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ' +
          (currentPage >= totalPages
            ? 'opacity-35 cursor-not-allowed text-zinc-500'
            : isLight
              ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/5'
              : 'text-white/70 hover:text-white hover:bg-white/10')
        }
      >
        <span>Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
