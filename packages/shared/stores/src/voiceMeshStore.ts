import { create } from 'zustand';

export interface VoicePeer {
  peerId: string;
  userId: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  audioLevel?: number;
}

export interface VoiceMeshState {
  activeRoomId: string | null;
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  peers: Record<string, VoicePeer>;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setPeer: (peer: VoicePeer) => void;
  removePeer: (peerId: string) => void;
  updatePeerAudioLevel: (peerId: string, level: number) => void;
}

export const useVoiceMeshStore = create<VoiceMeshState>((set) => ({
  activeRoomId: null,
  isConnected: false,
  isMuted: false,
  isDeafened: false,
  peers: {},
  joinRoom: (roomId) => set({ activeRoomId: roomId, isConnected: true, peers: {} }),
  leaveRoom: () => set({ activeRoomId: null, isConnected: false, peers: {} }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleDeafen: () => set((state) => ({ isDeafened: !state.isDeafened })),
  setPeer: (peer) =>
    set((state) => ({
      peers: { ...state.peers, [peer.peerId]: peer },
    })),
  removePeer: (peerId) =>
    set((state) => {
      const next = { ...state.peers };
      delete next[peerId];
      return { peers: next };
    }),
  updatePeerAudioLevel: (peerId, level) =>
    set((state) => {
      const existing = state.peers[peerId];
      if (!existing) return {};
      return {
        peers: { ...state.peers, [peerId]: { ...existing, audioLevel: level } },
      };
    }),
}));
