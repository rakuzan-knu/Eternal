/**
 * E2EE handshake relay: the server forwards ephemeral ECDH publics (+ identity
 * signatures) opaquely between caller and callee (F1). Contract:
 *  - present fields are relayed byte-identical, never interpreted;
 *  - absent fields leave legacy payloads byte-identical (conditional spread).
 */
import type { Server } from 'socket.io';
import { MessengerGateway } from '../messenger.gateway';

describe('MessengerGateway E2EE ephemeral relay (F1)', () => {
  const EPHEMERAL = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE-test-key-material';

  function buildGateway() {
    const gateway = new MessengerGateway(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const emitToUser = jest.spyOn(gateway, 'emitToUser').mockImplementation(() => {});
    Object.assign(gateway, {
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as unknown as Server,
      callsService: {
        initiateCall: jest.fn().mockResolvedValue({
          call: { id: 'call-1', initiator: { id: 'usr-1' } },
          targetUserIds: ['usr-2'],
        }),
        acceptCall: jest.fn().mockResolvedValue({
          initiatorId: 'usr-1',
          call: { participants: [] },
        }),
        mapToView: jest.fn().mockReturnValue({}),
      },
    });
    const client = { userId: 'usr-1' } as never;
    return { gateway, emitToUser, client };
  }

  it('relays the initiator ephemeral key inside call:incoming', async () => {
    const { gateway, emitToUser, client } = buildGateway();
    await gateway.handleCallInitiate(
      client,
      {
        conversationId: 'conv-1',
        callType: 'AUDIO',
        e2eeEphemeralKey: EPHEMERAL,
      } as never,
      () => {},
    );
    expect(emitToUser).toHaveBeenCalledTimes(1);
    const payload = emitToUser.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.e2eeEphemeralKey).toBe(EPHEMERAL);
  });

  it('omits the key entirely when the caller negotiated no E2EE', async () => {
    const { gateway, emitToUser, client } = buildGateway();
    await gateway.handleCallInitiate(
      client,
      { conversationId: 'conv-1', callType: 'AUDIO' } as never,
      () => {},
    );
    const payload = emitToUser.mock.calls[0][2] as Record<string, unknown>;
    expect('e2eeEphemeralKey' in payload).toBe(false);
  });

  it('relays the callee ephemeral key inside call:accepted', async () => {
    const { gateway, emitToUser, client } = buildGateway();
    await gateway.handleCallAccept(
      client,
      { callId: 'call-1', e2eeEphemeralKey: EPHEMERAL },
      () => {},
    );
    expect(emitToUser).toHaveBeenCalledTimes(1);
    const payload = emitToUser.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.e2eeEphemeralKey).toBe(EPHEMERAL);
  });

  it('omits the key in call:accepted when absent', async () => {
    const { gateway, emitToUser, client } = buildGateway();
    await gateway.handleCallAccept(client, { callId: 'call-1' }, () => {});
    const payload = emitToUser.mock.calls[0][2] as Record<string, unknown>;
    expect('e2eeEphemeralKey' in payload).toBe(false);
  });

  it('relays the identity binding signature alongside the ephemeral key', async () => {
    const { gateway, emitToUser, client } = buildGateway();
    await gateway.handleCallInitiate(
      client,
      {
        conversationId: 'conv-1',
        callType: 'AUDIO',
        e2eeEphemeralKey: EPHEMERAL,
        e2eeBindingSignature: 'c2lnbmF0dXJl',
      } as never,
      () => {},
    );
    const incoming = emitToUser.mock.calls[0][2] as Record<string, unknown>;
    expect(incoming.e2eeBindingSignature).toBe('c2lnbmF0dXJl');

    await gateway.handleCallAccept(
      client,
      {
        callId: 'call-1',
        e2eeEphemeralKey: EPHEMERAL,
        e2eeBindingSignature: 'c2lnbmF0dXJl',
      },
      () => {},
    );
    const accepted = emitToUser.mock.calls[1][2] as Record<string, unknown>;
    expect(accepted.e2eeBindingSignature).toBe('c2lnbmF0dXJl');
  });

  it('omits the signature independently when only the key is present', async () => {
    const { gateway, emitToUser, client } = buildGateway();
    await gateway.handleCallInitiate(
      client,
      { conversationId: 'conv-1', callType: 'AUDIO', e2eeEphemeralKey: EPHEMERAL } as never,
      () => {},
    );
    const payload = emitToUser.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.e2eeEphemeralKey).toBe(EPHEMERAL);
    expect('e2eeBindingSignature' in payload).toBe(false);
  });
});
