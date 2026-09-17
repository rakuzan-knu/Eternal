import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/shared/lib/useOnlineStatus';
import { useQueryClient } from '@tanstack/react-query';

export function OfflineBanner(): React.JSX.Element | null {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  if (isOnline) {
    return null;
  }

  const handleRetry = () => {
    void queryClient.refetchQueries();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-neutral-900/90 border border-amber-500/30 text-amber-200 text-xs font-medium shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
      <span>Offline Mode — Showing cached data from IndexedDB</span>
      <button
        type="button"
        onClick={handleRetry}
        className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
}

export default OfflineBanner;
