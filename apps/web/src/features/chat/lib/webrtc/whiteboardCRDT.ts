/**
 * P2P CRDT Whiteboard Engine powered by Yjs over RTCDataChannel
 *
 * Provides real-time, conflict-free collaborative drawing, sticky notes,
 * architecture shapes, and ephemeral participant cursor streaming directly
 * between WebRTC peers without requiring an external server or database.
 */

import * as Y from 'yjs';

export type WhiteboardToolType =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'diamond'
  | 'arrow'
  | 'line'
  | 'text'
  | 'sticky';

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardElement {
  id: string;
  type: WhiteboardToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  text?: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
}

export interface ParticipantCursor {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  activeTool?: WhiteboardToolType;
  lastActive: number;
}

export interface WhiteboardSyncMessage {
  type: 'SYNC_STEP_1' | 'SYNC_STEP_2' | 'DOC_UPDATE' | 'CURSOR' | 'CLEAR_BOARD';
  payload: unknown;
  senderId: string;
}

export interface WhiteboardEngineOptions {
  userId?: string;
  userName?: string;
  userColor?: string;
}

// Convert Uint8Array to/from base64 for safe JSON serialization over DataChannel
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class WhiteboardCRDTEngine {
  private readonly doc: Y.Doc;
  private readonly elementsMap: Y.Map<WhiteboardElement>;
  private readonly undoManager: Y.UndoManager;
  private readonly channels = new Map<string, RTCDataChannel>();
  private readonly remoteCursors = new Map<string, ParticipantCursor>();
  private cursorPruneInterval: ReturnType<typeof setInterval> | null = null;

  private userId: string;
  private userName: string;
  private userColor: string;

  private elementsListeners = new Set<(elements: WhiteboardElement[]) => void>();
  private cursorListeners = new Set<(cursors: ParticipantCursor[]) => void>();

  constructor(options: WhiteboardEngineOptions = {}) {
    this.userId = options.userId || 'me';
    this.userName = options.userName || 'You';
    this.userColor = options.userColor || this.generateUserColor(this.userId);

    this.doc = new Y.Doc();
    this.elementsMap = this.doc.getMap<WhiteboardElement>('elements');
    this.undoManager = new Y.UndoManager(this.elementsMap);

    // Observe local & remote document changes
    this.elementsMap.observe(() => {
      const elements = this.getElements();
      this.elementsListeners.forEach((fn) => fn(elements));
    });

    // Broadcast incremental updates produced on this document
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') {
        const updateB64 = uint8ToBase64(update);
        this.broadcast({
          type: 'DOC_UPDATE',
          payload: updateB64,
          senderId: this.userId,
        });
      }
    });

    // Periodically prune stale remote cursors (inactive > 10 seconds)
    this.cursorPruneInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, cur] of this.remoteCursors.entries()) {
        if (now - cur.lastActive > 10000) {
          this.remoteCursors.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.emitCursors();
      }
    }, 2000);
  }

  /**
   * Update current user profile info for element authoring & cursor badges
   */
  updateUser(userId: string, userName: string, userColor?: string): void {
    this.userId = userId;
    this.userName = userName;
    if (userColor) {
      this.userColor = userColor;
    }
  }

  /**
   * Get current local author info
   */
  getAuthor(): { id: string; name: string } {
    return { id: this.userId, name: this.userName };
  }

  /**
   * Bind an RTCDataChannel for whiteboard sync
   */
  bindDataChannel(peerIdOrChannel: string | RTCDataChannel, maybeChannel?: RTCDataChannel): void {
    let peerId: string;
    let channel: RTCDataChannel;

    if (typeof peerIdOrChannel === 'string') {
      peerId = peerIdOrChannel;
      channel = maybeChannel!;
    } else {
      channel = peerIdOrChannel;
      peerId = typeof maybeChannel === 'string' ? maybeChannel : 'peer';
    }

    if (!channel || channel.label !== 'p2p-crdt-whiteboard') return;

    this.channels.set(peerId, channel);

    const onOpen = () => {
      // Step 1: Send our state vector so peer can calculate diffs
      const stateVector = Y.encodeStateVector(this.doc);
      this.sendToPeer(channel, {
        type: 'SYNC_STEP_1',
        payload: uint8ToBase64(stateVector),
        senderId: this.userId,
      });
    };

    const onMessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as WhiteboardSyncMessage;
        this.handleMessage(msg, channel);
      } catch (err) {
        console.warn('[WhiteboardCRDT] Failed to parse message:', err);
      }
    };

    const onClose = () => {
      this.channels.delete(peerId);
      this.remoteCursors.delete(peerId);
      this.emitCursors();
      channel.removeEventListener('open', onOpen);
      channel.removeEventListener('message', onMessage);
      channel.removeEventListener('close', onClose);
    };

    channel.addEventListener('open', onOpen);
    channel.addEventListener('message', onMessage);
    channel.addEventListener('close', onClose);

    if (channel.readyState === 'open') {
      onOpen();
    }
  }

  unbindPeer(peerId: string): void {
    this.channels.delete(peerId);
    this.remoteCursors.delete(peerId);
    this.emitCursors();
  }

  /**
   * Add or replace a whiteboard element
   */
  addElement(element: WhiteboardElement): void {
    this.doc.transact(() => {
      this.elementsMap.set(element.id, {
        ...element,
        updatedAt: Date.now(),
      });
    });
  }

  /**
   * Update an existing element partially
   */
  updateElement(id: string, partial: Partial<WhiteboardElement>): void {
    const existing = this.elementsMap.get(id);
    if (!existing) return;

    this.doc.transact(() => {
      this.elementsMap.set(id, {
        ...existing,
        ...partial,
        updatedAt: Date.now(),
      });
    });
  }

  /**
   * Delete an element by ID
   */
  deleteElement(id: string): void {
    this.doc.transact(() => {
      this.elementsMap.delete(id);
    });
  }

  /**
   * Clear all whiteboard elements
   */
  clearBoard(): void {
    this.doc.transact(() => {
      const keys = Array.from(this.elementsMap.keys());
      keys.forEach((k) => this.elementsMap.delete(k));
    });
    this.broadcast({
      type: 'CLEAR_BOARD',
      payload: null,
      senderId: this.userId,
    });
  }

  /**
   * Broadcast local pointer cursor coordinates
   */
  sendCursor(x: number, y: number, activeTool?: WhiteboardToolType): void {
    const cursor: ParticipantCursor = {
      userId: this.userId,
      userName: this.userName,
      color: this.userColor,
      x,
      y,
      ...(activeTool ? { activeTool } : {}),
      lastActive: Date.now(),
    };

    this.broadcast({
      type: 'CURSOR',
      payload: cursor,
      senderId: this.userId,
    });
  }

  /**
   * Get all elements as a sorted array
   */
  getElements(): WhiteboardElement[] {
    const items: WhiteboardElement[] = [];
    this.elementsMap.forEach((val) => {
      if (val) items.push(val);
    });
    return items.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Undo/Redo operations
   */
  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  /**
   * Subscriptions
   */
  subscribeElements(listener: (elements: WhiteboardElement[]) => void): () => void {
    this.elementsListeners.add(listener);
    listener(this.getElements());
    return () => {
      this.elementsListeners.delete(listener);
    };
  }

  subscribeCursors(listener: (cursors: ParticipantCursor[]) => void): () => void {
    this.cursorListeners.add(listener);
    listener(Array.from(this.remoteCursors.values()));
    return () => {
      this.cursorListeners.delete(listener);
    };
  }

  private handleMessage(msg: WhiteboardSyncMessage, channel: RTCDataChannel): void {
    if (msg.senderId === this.userId) return;

    switch (msg.type) {
      case 'SYNC_STEP_1': {
        // Peer sent their state vector; calculate what they are missing and send step 2
        const remoteStateVector = base64ToUint8(msg.payload as string);
        const update = Y.encodeStateAsUpdate(this.doc, remoteStateVector);
        this.sendToPeer(channel, {
          type: 'SYNC_STEP_2',
          payload: uint8ToBase64(update),
          senderId: this.userId,
        });
        break;
      }
      case 'SYNC_STEP_2':
      case 'DOC_UPDATE': {
        const update = base64ToUint8(msg.payload as string);
        Y.applyUpdate(this.doc, update, 'remote');
        break;
      }
      case 'CURSOR': {
        const cursor = msg.payload as ParticipantCursor;
        if (cursor && cursor.userId) {
          this.remoteCursors.set(cursor.userId, {
            ...cursor,
            lastActive: Date.now(),
          });
          this.emitCursors();
        }
        break;
      }
      case 'CLEAR_BOARD': {
        this.doc.transact(() => {
          const keys = Array.from(this.elementsMap.keys());
          keys.forEach((k) => this.elementsMap.delete(k));
        });
        break;
      }
    }
  }

  private broadcast(msg: WhiteboardSyncMessage): void {
    const serialized = JSON.stringify(msg);
    this.channels.forEach((channel) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(serialized);
        } catch (err) {
          console.warn('[WhiteboardCRDT] Send failed:', err);
        }
      }
    });
  }

  private sendToPeer(channel: RTCDataChannel, msg: WhiteboardSyncMessage): void {
    if (channel.readyState === 'open') {
      try {
        channel.send(JSON.stringify(msg));
      } catch (err) {
        console.warn('[WhiteboardCRDT] Send to peer failed:', err);
      }
    }
  }

  private emitCursors(): void {
    const cursors = Array.from(this.remoteCursors.values());
    this.cursorListeners.forEach((fn) => fn(cursors));
  }

  private generateUserColor(id: string): string {
    const colors = [
      '#06b6d4', // cyan
      '#8b5cf6', // violet
      '#f59e0b', // amber
      '#10b981', // emerald
      '#ec4899', // pink
      '#3b82f6', // blue
      '#f43f5e', // rose
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx] || '#06b6d4';
  }

  destroy(): void {
    if (this.cursorPruneInterval) {
      clearInterval(this.cursorPruneInterval);
      this.cursorPruneInterval = null;
    }
    this.elementsListeners.clear();
    this.cursorListeners.clear();
    this.channels.clear();
    this.remoteCursors.clear();
    this.undoManager.destroy();
    this.doc.destroy();
  }
}
