import { useState, useEffect } from 'react';

/**
 * Formats elapsed time into Discord-style compact format for friend rows.
 * Examples: '1 hr', '48 min', '< 1 min'
 */
export function formatShortDuration(startedAt?: string | null): string {
  if (!startedAt) return '';
  const diffMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} hr`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return '< 1 min';
}

/**
 * React hook that provides a live stopwatch counter (ticking every second).
 * Formats: '48:23' or '01:14:02'
 */
export function useLiveElapsedTimer(startedAt?: string | null): string {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startedAt) {
      setElapsed('');
      return;
    }

    const calc = () => {
      const diffMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      if (hours > 0) {
        setElapsed(
          `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        );
      } else {
        setElapsed(`${minutes}:${String(seconds).padStart(2, '0')}`);
      }
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}
