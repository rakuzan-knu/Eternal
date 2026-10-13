import { useLocation } from 'react-router-dom';
import { useMessengerRealtime } from '@/features/chat/model/useMessengerRealtime';

/** User-room events preserve notifications without loading chat lists/history. */
export function GlobalMessengerEvents() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/(?:messages|messenger|chat\/standalone)\/([^/]+)$/);
  const activeId = match?.[1] ?? null;
  useMessengerRealtime(activeId ? [activeId] : [], activeId, true);
  return null;
}
