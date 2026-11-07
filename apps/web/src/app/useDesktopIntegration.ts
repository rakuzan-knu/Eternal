import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDesktopBridge } from '@/shared/lib/platform';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useDesktopIntegration(): void {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.userId);
  const navigateRef = useRef(navigate);
  const authenticatedRef = useRef(isAuthenticated);
  const pendingPath = useRef<string | null>(null);

  useEffect(() => {
    navigateRef.current = navigate;
    if (authenticatedRef.current && !isAuthenticated) pendingPath.current = null;
    authenticatedRef.current = isAuthenticated;
    if (isAuthenticated && pendingPath.current) {
      navigate(pendingPath.current);
      pendingPath.current = null;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!desktop?.resetNativeState) return;
    if (!userId) void desktop.resetNativeState().catch(() => {});
    return () => {
      void desktop.resetNativeState().catch(() => {});
    };
  }, [userId]);

  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!desktop?.waitForNavigation) return;
    let disposed = false;
    const listen = async () => {
      try {
        while (!disposed) {
          const path = await desktop.waitForNavigation();
          if (disposed || !path) continue;
          if (authenticatedRef.current) navigateRef.current(path);
          else pendingPath.current = path;
        }
      } catch {
        console.debug('Desktop navigation unavailable');
      }
    };
    void Promise.resolve().then(() => {
      if (!disposed) return listen();
    });
    return () => {
      disposed = true;
    };
  }, []);
}
