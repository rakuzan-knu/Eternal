import React from 'react';
import { useCallStore } from '../../model/callStore';

interface CallSchemaOrgProps {
  callId?: string;
  isLive?: boolean;
}

/**
 * Schema.org JSON-LD Structured Data for Real-Time WebRTC Calls & Broadcasts
 *
 * Implements Google Search indexing standards:
 * - SoftwareApplication: WebRTC enterprise encrypted communication suite
 * - BroadcastEvent: Live interactive video conference / scheduled stream
 */
export function CallSchemaOrg({ callId, isLive = true }: CallSchemaOrgProps) {
  const activeCallId = useCallStore((s) => s.callId) || callId || 'live-call';
  const remoteUser = useCallStore((s) => s.remoteParticipant);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Genyxo Encrypted WebRTC Real-Time Suite',
        operatingSystem: 'All',
        applicationCategory: 'CommunicationApplication',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Post-Quantum Cryptography E2EE (ML-KEM-768 & ML-DSA-65)',
          'Decentralized P2P Gossip Relay Signaling',
          'Document Picture-in-Picture Native OS Floating Window',
          'Push-to-Talk with 250ms Audio Release Tail',
          'Traveler Eco-Mode Battery & 4G Data Saver',
          'Non-Terrestrial Satellite GCC Congestion Control (Starlink)',
          'CRDT Real-Time Collaborative Whiteboard',
          'Frame-Accurate SyncPlay Watch Together',
        ],
      },
      {
        '@type': 'BroadcastEvent',
        name: `Genyxo Secure Conference #${activeCallId.slice(0, 8)}`,
        isLiveBroadcast: isLive,
        videoFormat: 'HD',
        broadcastDisplayName: remoteUser?.displayName || 'WebRTC Room',
        startDate: new Date().toISOString(),
        eventStatus: 'https://schema.org/EventScheduled',
        description: 'HD video call.',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
