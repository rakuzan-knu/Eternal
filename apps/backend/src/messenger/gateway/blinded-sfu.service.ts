import { Injectable, Logger } from '@nestjs/common';
import { signBlinded, verifyTicket } from '@social-network/blinded-crypto';
import * as crypto from 'crypto';

export interface BlindedParticipantSession {
  socketId: string;
  blindedParticipantId: string;
  blindedRoomToken: string;
  joinedAt: number;
}

interface BlindedRsaKeypair {
  readonly nHex: string;
  readonly eHex: string;
  readonly dHex: string;
  /** True when generated in-process (demo only — never for production). */
  readonly ephemeral: boolean;
}

/** Process-wide ephemeral fallback: generated once, never persisted. */
let ephemeralKeypair: BlindedRsaKeypair | null = null;

function requiredJwkField(value: string | undefined, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`blind-sfu: RSA JWK export missing ${field}`);
  }
  return value;
}

/**
 * Keypair resolution order:
 *  1. BLIND_RSA_N_HEX / BLIND_RSA_E_HEX / BLIND_RSA_D_HEX (production: HSM or
 *     secret manager material injected as env; see backend/.env.example).
 *  2. Ephemeral 2048-bit keypair generated once per process (local demo/dev).
 */
function loadKeypair(logger: Logger): BlindedRsaKeypair {
  const nHex = process.env.BLIND_RSA_N_HEX;
  const eHex = process.env.BLIND_RSA_E_HEX;
  const dHex = process.env.BLIND_RSA_D_HEX;
  if (nHex && eHex && dHex) {
    return { nHex, eHex, dHex, ephemeral: false };
  }
  if (ephemeralKeypair === null) {
    logger.warn(
      'BLIND_RSA_* not set — generating an ephemeral 2048-bit demo keypair. ' +
        'Rooms will NOT survive restarts. Set BLIND_RSA_* from HSM/env for anything real.',
    );
    // One-time process-boot keygen for the demo fallback only (cached per
    // process); production injects BLIND_RSA_* and never touches this path.
    // Never called per-request.
    // eslint-disable-next-line no-sync
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 0x10001,
    });
    const jwk = privateKey.export({ format: 'jwk' });
    const b64u = (s: string | undefined, field: string): string =>
      Buffer.from(requiredJwkField(s, field), 'base64').toString('hex');
    ephemeralKeypair = {
      nHex: b64u(jwk.n, 'n'),
      eHex: b64u(jwk.e, 'e'),
      dHex: b64u(jwk.d, 'd'),
      ephemeral: true,
    };
  }
  return ephemeralKeypair;
}

@Injectable()
export class BlindedSfuService {
  private readonly logger = new Logger(BlindedSfuService.name);
  private readonly keypair: BlindedRsaKeypair;

  constructor() {
    this.keypair = loadKeypair(this.logger);
  }

  // In-memory zero-metadata routing tables
  // BlindedRoomToken -> Set of socket IDs
  private readonly blindedRooms = new Map<string, Set<string>>();
  // socketId -> session
  private readonly sessions = new Map<string, BlindedParticipantSession>();

  public getPublicKey(): { n: string; e: string } {
    return { n: this.keypair.nHex, e: this.keypair.eHex };
  }

  /**
   * Signs a blinded message: s' = (m')^d mod n
   * The server never sees the underlying message m.
   * Delegates to @social-network/blinded-crypto (windowed modpow; identical math).
   */
  public signBlindedMessage(blindedMessageHex: string): string {
    return signBlinded({
      nHex: this.keypair.nHex,
      dHex: this.keypair.dHex,
      blindedHex: blindedMessageHex,
    });
  }

  /**
   * Verifies an unblinded ticket: s^e mod n == m mod n
   */
  public verifyTicket(ticketHex: string, signatureHex: string): boolean {
    return verifyTicket({
      nHex: this.keypair.nHex,
      eHex: this.keypair.eHex,
      ticketHex,
      signatureHex,
    });
  }

  /**
   * Registers a participant using blind verification.
   * Neither IP address nor user account ID is associated with the session.
   */
  public registerBlindedSession(
    socketId: string,
    blindedRoomToken: string,
    ticketHex: string,
    signatureHex: string,
  ): { success: boolean; blindedParticipantId?: string } {
    const isValid = this.verifyTicket(ticketHex, signatureHex);
    if (!isValid) {
      this.logger.warn(`Blinded SFU authorization rejected for socket ${socketId}`);
      return { success: false };
    }

    // Ephemeral identifier derived purely from ticket hash
    const blindedParticipantId = `bp_${crypto
      .createHash('sha256')
      .update(ticketHex)
      .digest('hex')
      .substring(0, 12)}`;

    const session: BlindedParticipantSession = {
      socketId,
      blindedParticipantId,
      blindedRoomToken,
      joinedAt: Date.now(),
    };

    this.sessions.set(socketId, session);

    if (!this.blindedRooms.has(blindedRoomToken)) {
      this.blindedRooms.set(blindedRoomToken, new Set());
    }
    this.blindedRooms.get(blindedRoomToken)!.add(socketId);

    this.logger.log(
      `Zero-Trust participant registered: ${blindedParticipantId} in room token: ${blindedRoomToken.substring(0, 8)}...`,
    );

    return { success: true, blindedParticipantId };
  }

  /**
   * Returns destination socket IDs for onion/blinded routing within the room
   */
  public getRoomDestinations(blindedRoomToken: string, senderSocketId: string): string[] {
    const roomSockets = this.blindedRooms.get(blindedRoomToken);
    if (!roomSockets) return [];

    const destinations: string[] = [];
    for (const sid of roomSockets) {
      if (sid !== senderSocketId) {
        destinations.push(sid);
      }
    }
    return destinations;
  }

  /**
   * Removes session upon disconnect
   */
  public removeSession(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;

    this.sessions.delete(socketId);
    const roomSockets = this.blindedRooms.get(session.blindedRoomToken);
    if (roomSockets) {
      roomSockets.delete(socketId);
      if (roomSockets.size === 0) {
        this.blindedRooms.delete(session.blindedRoomToken);
      }
    }
  }
}
