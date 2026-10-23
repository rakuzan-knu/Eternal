import { useLocation } from 'react-router-dom';
import { useMessengerRealtime } from '@/features/chat/model/useMessengerRealtime';
import { useUIStore } from '@/shared/model/useUIStore';

/** User-room events preserve notifications without loading chat lists/history. */
export function GlobalMessengerEvents() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/(?:messages|messenger|chat\/standalone)\/([^/]+)$/);
  const communityConversationId = useUIStore((state) => state.activeConversationId);
  const activeId =
    match?.[1] ?? (pathname.startsWith('/communities/') ? communityConversationId : null);
  useMessengerRealtime(activeId ? [activeId] : [], activeId, true);
  return null;
}
