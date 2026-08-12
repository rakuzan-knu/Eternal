import { Monitor, Smartphone, Globe, Loader2, LogOut } from 'lucide-react';
import SlideOverPanel from '@/shared/ui/SlideOverPanel';
import { useSessions, useRevokeSession, useRevokeAllSessions } from '../../model/useSessions';
import type { SessionView } from '../../model/privacyTypes';

interface SessionsPanelProps {
  onClose: () => void;
}

function deviceIcon(name: string | null) {
  const n = (name ?? '').toLowerCase();
  if (/(iphone|android|mobile|phone)/.test(n)) return Smartphone;
  if (/(chrome|firefox|safari|edge|windows|mac|linux)/.test(n)) return Monitor;
  return Globe;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'active now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function location(s: SessionView): string {
  const parts = [s.city, s.country].filter(Boolean);
  return parts.length ? parts.join(', ') : (s.ip ?? 'Unknown location');
}

export default function SessionsPanel({ onClose }: SessionsPanelProps) {
  const { data: sessions, isLoading } = useSessions();
  const revoke = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const others = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <SlideOverPanel title="Active sessions" onClose={onClose}>
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          {sessions?.map((s) => {
            const Icon = deviceIcon(s.deviceName);
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5"
              >
                <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-200">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {s.deviceName ?? 'Unknown device'}
                    {s.isCurrent && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {location(s)} · {relativeTime(s.lastActiveAt)}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => revoke.mutate(s.id)}
                    disabled={revoke.isPending && revoke.variables === s.id}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/15 transition-colors active:scale-95 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}

          {others.length > 0 && (
            <button
              onClick={() => revokeAll.mutate()}
              disabled={revokeAll.isPending}
              className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors active:scale-[0.99] disabled:opacity-50"
            >
              {revokeAll.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              Terminate all other sessions
            </button>
          )}
        </>
      )}
    </SlideOverPanel>
  );
}
