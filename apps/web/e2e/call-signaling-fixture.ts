import { createServer } from 'node:http';
import { once } from 'node:events';
import { Server } from 'socket.io';
import parser from 'socket.io-msgpack-parser';
import type { CallSessionView, UserSnapshot } from '@social-network/shared-contracts';

interface Offer {
  conversationId: string;
  callType: 'AUDIO' | 'VIDEO';
  sdpOffer: RTCSessionDescriptionInit;
  iceCandidates: RTCIceCandidateInit[];
  e2eeEphemeralKey?: string;
  e2eeBindingSignature?: string;
}

/** A transport-only server: key generation and SDP negotiation stay in the app. */
export async function createCallSignalingFixture(users: UserSnapshot[]) {
  const httpServer = createServer();
  const io = new Server(httpServer, { parser, cors: { origin: true, credentials: true } });
  const messenger = io.of('/messenger');
  const connectedUsers = new Set<string>();
  const handshakes: Array<{ ephemeralKey?: string; signature?: string }> = [];
  let call: CallSessionView | null = null;

  messenger.on('connection', (socket) => {
    const user = users.find((candidate) => socket.handshake.auth.token === `token-${candidate.id}`);
    if (!user) {
      socket.disconnect(true);
      return;
    }
    connectedUsers.add(user.id);
    void socket.join(user.id);
    socket.on('disconnect', () => connectedUsers.delete(user.id));

    socket.on('call:initiate', (offer: Offer, acknowledge) => {
      const startedAt = new Date().toISOString();
      call = {
        id: 'call-e2e-session',
        conversationId: offer.conversationId,
        type: offer.callType,
        status: 'RINGING',
        initiatorId: user.id,
        initiator: user,
        startedAt,
        endedAt: null,
        durationMs: null,
        participants: users.map((participant) => ({
          id: `participant-${participant.id}`,
          callId: 'call-e2e-session',
          userId: participant.id,
          user: participant,
          joinedAt: startedAt,
          leftAt: null,
          muteState: false,
          videoState: true,
          screenShare: false,
          role: 'MEMBER',
        })),
      };
      handshakes.push({
        ephemeralKey: offer.e2eeEphemeralKey,
        signature: offer.e2eeBindingSignature,
      });
      acknowledge({ status: 'ok', callId: call.id, call });
      for (const peer of users.filter((candidate) => candidate.id !== user.id)) {
        messenger.to(peer.id).emit('call:incoming', {
          ...offer,
          callId: call.id,
          callerId: user.id,
          caller: user,
        });
      }
    });
    socket.on('call:accept', (answer, acknowledge) => {
      if (!call || answer.callId !== call.id) {
        acknowledge({ status: 'error' });
        return;
      }
      call = { ...call, status: 'CONNECTED' };
      handshakes.push({
        ephemeralKey: answer.e2eeEphemeralKey,
        signature: answer.e2eeBindingSignature,
      });
      acknowledge({ status: 'ok', call });
      messenger.to(call.initiatorId).emit('call:accepted', { ...answer, accepterId: user.id });
    });
    socket.on('call:ice-candidate', (data) => {
      messenger
        .to(data.targetUserId)
        .emit('call:ice-candidate', { ...data, senderUserId: user.id });
    });
    socket.on('call:ice-restart', (data) => {
      messenger.to(data.targetUserId).emit('call:ice-restart', { ...data, senderUserId: user.id });
    });
    socket.on('call:ice-restart-answer', (data) => {
      messenger.to(data.targetUserId).emit('call:ice-restart-answer', data);
    });
    socket.on('call:end', (data) => {
      messenger.emit('call:ended', { ...data, conversationId: call?.conversationId });
    });
  });

  httpServer.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
  const address = httpServer.address();
  if (!address || typeof address === 'string')
    throw new Error('Signaling fixture did not bind a port');
  return {
    port: address.port,
    connectedUsers,
    handshakes,
    close: () => new Promise<void>((resolve) => io.close(() => resolve())),
  };
}
