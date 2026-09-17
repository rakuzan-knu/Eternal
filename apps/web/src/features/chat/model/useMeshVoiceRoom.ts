import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatSocket } from './useChatSocket';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { MeshVoiceRoomManager, VoiceMeshSignalPayload } from '../lib/webrtc/meshVoiceRoom';

export function useMeshVoiceRoom() {
  const socket = useChatSocket();
  const currentUserId = useAuthStore((s) => s.userId);

  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  const managerRef = useRef<MeshVoiceRoomManager | null>(null);

  useEffect(() => {
    if (!currentUserId || !socket) return;

    const emitFn = (event: string, payload: unknown, callback?: (res: unknown) => void) => {
      if (callback) {
        socket.emit(event, payload, callback);
      } else {
        socket.emit(event, payload);
      }
    };

    const manager = new MeshVoiceRoomManager(currentUserId, emitFn, {
      onPeersChange: (newPeers) => {
        setPeers(newPeers);
      },
      onSpeakingChange: (peerId, speaking) => {
        setSpeakingPeers((prev) => {
          const next = new Set(prev);
          if (speaking) next.add(peerId);
          else next.delete(peerId);
          return next;
        });
      },
      onLocalSpeakingChange: (speaking) => {
        setIsLocalSpeaking(speaking);
      },
    });

    managerRef.current = manager;

    // Listen for signaling events
    const handlePeerJoined = (data: { roomId: string; peerId: string }) => {
      if (managerRef.current?.getRoomId() === data.roomId) {
        void managerRef.current.handlePeerJoined(data.peerId);
      }
    };

    const handlePeerLeft = (data: { roomId: string; peerId: string }) => {
      if (managerRef.current?.getRoomId() === data.roomId) {
        managerRef.current.handlePeerLeft(data.peerId);
      }
    };

    const handleSignal = (data: {
      roomId: string;
      senderPeerId: string;
      signal: VoiceMeshSignalPayload;
    }) => {
      if (managerRef.current?.getRoomId() === data.roomId) {
        void managerRef.current.handleSignal(data.senderPeerId, data.signal);
      }
    };

    socket.on('voice:mesh-peer-joined', handlePeerJoined);
    socket.on('voice:mesh-peer-left', handlePeerLeft);
    socket.on('voice:mesh-signal', handleSignal);

    return () => {
      socket.off('voice:mesh-peer-joined', handlePeerJoined);
      socket.off('voice:mesh-peer-left', handlePeerLeft);
      socket.off('voice:mesh-signal', handleSignal);
      manager.leave();
      managerRef.current = null;
    };
  }, [currentUserId, socket]);

  const joinRoom = useCallback(async (roomId: string) => {
    if (!managerRef.current) return;
    await managerRef.current.join(roomId);
    setCurrentRoomId(roomId);
    setIsConnected(true);
    setIsMuted(false);
    setIsDeafened(false);
  }, []);

  const leaveRoom = useCallback(() => {
    if (!managerRef.current) return;
    managerRef.current.leave();
    setCurrentRoomId(null);
    setIsConnected(false);
    setPeers([]);
    setSpeakingPeers(new Set());
    setIsLocalSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!managerRef.current) return;
    const next = managerRef.current.toggleMute();
    setIsMuted(next);
  }, []);

  const toggleDeafen = useCallback(() => {
    if (!managerRef.current) return;
    const next = managerRef.current.toggleDeafen();
    setIsDeafened(next);
  }, []);

  return {
    isConnected,
    currentRoomId,
    peers,
    speakingPeers,
    isLocalSpeaking,
    isMuted,
    isDeafened,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleDeafen,
  };
}
