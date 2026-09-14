import { useEffect, useRef } from 'react';
import { useNotificationStore } from '@/entities/notification/model/useNotificationStore';

export function useDynamicTabBadge() {
  const totalUnread = useNotificationStore((state) => state.unreadCounts.total);
  const originalTitleRef = useRef<string>('');
  const originalFaviconHrefRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Clean current title without existing (N) badge
    const currentTitle = document.title;
    const cleanTitle = currentTitle.replace(/^\(\d+\)\s*/, '') || 'Eternal';
    originalTitleRef.current = cleanTitle;

    // 1. Dynamic Tab Title Update
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${cleanTitle}`;
    } else {
      document.title = cleanTitle;
    }

    // 2. Dynamic Favicon Badge Update
    const favicon = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || null;
    if (!favicon) return;

    if (!originalFaviconHrefRef.current) {
      originalFaviconHrefRef.current = favicon.href;
    }

    if (totalUnread <= 0) {
      if (originalFaviconHrefRef.current) {
        favicon.href = originalFaviconHrefRef.current;
      }
      return;
    }

    // Draw dynamic purple glowing dot on favicon
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalFaviconHrefRef.current || '/favicon.ico';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw base favicon
        ctx.drawImage(img, 0, 0, 32, 32);

        // Draw purple notification dot with glow
        const dotRadius = 6;
        const dotX = 25;
        const dotY = 7;

        // Outer dark ring for contrast
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius + 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#0b0c10';
        ctx.fill();

        // Inner glowing purple badge
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#a855f7';
        ctx.fill();

        // White micro-center for punchy visibility
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius - 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        favicon.href = canvas.toDataURL('image/png');
      } catch {
        // Fallback gracefully if canvas tainted
      }
    };
  }, [totalUnread]);
}
