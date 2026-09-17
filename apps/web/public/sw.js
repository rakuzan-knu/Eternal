// Service Worker for Browser Web Push, Voice & Video Call Signaling, and Notifications

const callChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('eternal_calls') : null;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Eternal Notification',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    data: { url: '/notifications' },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  // Handle Incoming Call Push
  if (data.type === 'INCOMING_CALL' || data.callId) {
    const isVideo = data.callType === 'VIDEO' || data.callType === 'video';
    const callerName =
      data.callerName || data.caller?.displayName || data.caller?.username || 'Someone';

    if (callChannel) {
      callChannel.postMessage({
        type: 'CALL_INCOMING_PUSH',
        callId: data.callId,
        callerId: data.callerId,
        callerName,
        callType: isVideo ? 'video' : 'audio',
      });
    }

    // Pre-warm ICE servers in background before React UI mounts
    const prewarmIcePromise = fetch('/calls/ice-servers', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((iceConfig) => {
        if (iceConfig && callChannel) {
          callChannel.postMessage({
            type: 'PREWARMED_ICE_SERVERS',
            callId: data.callId,
            iceServers: iceConfig.iceServers,
          });
        }
      })
      .catch(() => {});

    event.waitUntil(
      Promise.all([
        prewarmIcePromise,
        self.registration.showNotification(
          data.title || `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
          {
            body: data.body || `${callerName} is calling you...`,
            icon: data.icon || data.caller?.avatar || '/favicon.ico',
            badge: '/favicon.ico',
            tag: `incoming-call-${data.callId}`,
            vibrate: [500, 200, 500, 200, 600],
            requireInteraction: true,
            renotify: true,
            data: {
              url: data.conversationId
                ? `/chat?conv=${data.conversationId}&callId=${data.callId}`
                : '/chat',
              callId: data.callId,
              type: 'INCOMING_CALL',
            },
            actions: [
              { action: 'accept', title: '📞 Accept' },
              { action: 'decline', title: '✕ Decline' },
            ],
          },
        ),
      ]),
    );
    return;
  }

  // Standard notification push
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || { url: '/notifications' },
      tag: data.tag || 'eternal-notification',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const action = event.action;
  const targetUrl = notifData.url || '/chat';

  // Handle Call Action Buttons
  if (notifData.type === 'INCOMING_CALL' || notifData.callId) {
    if (action === 'decline') {
      if (callChannel) {
        callChannel.postMessage({
          type: 'CALL_DECLINED_FROM_PUSH',
          callId: notifData.callId,
        });
      }
      // Attempt background decline REST call
      if (notifData.callId) {
        event.waitUntil(
          fetch(`/calls/${notifData.callId}/decline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'DECLINED' }),
          }).catch(() => {}),
        );
      }
      return;
    }

    if (action === 'accept') {
      if (callChannel) {
        callChannel.postMessage({
          type: 'CALL_ACCEPTED_FROM_PUSH',
          callId: notifData.callId,
        });
      }
    }
  }

  // Open or focus target window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
