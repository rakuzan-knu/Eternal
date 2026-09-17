import { clsx, type ClassValue } from 'clsx';

/**
 * Combines class names using clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format relative time from an ISO date or timestamp (e.g., "5m ago", "2h ago", "yesterday")
 */
export function formatRelativeTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;

  return `${Math.floor(diffInDays / 365)}y ago`;
}

/**
 * Format large numbers to compact notation (e.g. 1500 -> "1.5K", 2300000 -> "2.3M")
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (num < 1_000_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Sleep helper for asynchronous operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function for high-frequency input events
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Throttle function for rate-limited callbacks
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  intervalMs: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Extracts mentions (@username) and hashtags (#tag) from text
 */
export function extractTags(text: string): { mentions: string[]; hashtags: string[] } {
  const mentionMatches = text.match(/@([a-zA-Z0-9_]{3,30})/g) || [];
  const hashtagMatches = text.match(/#([a-zA-Z0-9_]{1,50})/g) || [];

  return {
    mentions: mentionMatches.map((m) => m.slice(1)),
    hashtags: hashtagMatches.map((h) => h.slice(1)),
  };
}
