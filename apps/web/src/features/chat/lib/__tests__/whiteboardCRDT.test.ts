import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhiteboardCRDTEngine, WhiteboardElement } from '../webrtc/whiteboardCRDT';

class MockDataChannel {
  label = 'p2p-crdt-whiteboard';
  readyState: 'connecting' | 'open' | 'closing' | 'closed' = 'open';
  sentData: string[] = [];
  peerChannel: MockDataChannel | null = null;
  private listeners: Record<string, ((event: { data: string }) => void)[]> = {};

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: { data: string }) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  send(data: string) {
    this.sentData.push(data);
    // Directly dispatch to paired peer channel if connected
    if (this.peerChannel) {
      this.peerChannel.simulateReceive(data);
    }
  }

  simulateReceive(data: string) {
    const event = { data };
    this.listeners['message']?.forEach((cb) => cb(event));
  }
}

describe('WhiteboardCRDTEngine', () => {
  let engineA: WhiteboardCRDTEngine;
  let engineB: WhiteboardCRDTEngine;
  let channelA: MockDataChannel;
  let channelB: MockDataChannel;

  beforeEach(() => {
    engineA = new WhiteboardCRDTEngine({
      userId: 'user-a',
      userName: 'Alice',
      userColor: '#06b6d4',
    });

    engineB = new WhiteboardCRDTEngine({
      userId: 'user-b',
      userName: 'Bob',
      userColor: '#8b5cf6',
    });

    channelA = new MockDataChannel();
    channelB = new MockDataChannel();

    channelA.peerChannel = channelB;
    channelB.peerChannel = channelA;
  });

  it('initializes and manages elements locally with undo/redo', () => {
    const el: WhiteboardElement = {
      id: 'rect-1',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      authorId: 'user-a',
      authorName: 'Alice',
      createdAt: 1000,
      updatedAt: 1000,
    };

    engineA.addElement(el);
    expect(engineA.getElements().length).toBe(1);
    expect(engineA.getElements()[0]?.id).toBe('rect-1');

    // Undo adds
    expect(engineA.canUndo()).toBe(true);
    engineA.undo();
    expect(engineA.getElements().length).toBe(0);

    // Redo
    expect(engineA.canRedo()).toBe(true);
    engineA.redo();
    expect(engineA.getElements().length).toBe(1);
  });

  it('converges state between two peers over DataChannel', () => {
    // Connect channel pair
    engineA.bindDataChannel('peer-b', channelA as unknown as RTCDataChannel);
    engineB.bindDataChannel('peer-a', channelB as unknown as RTCDataChannel);

    const sticky: WhiteboardElement = {
      id: 'sticky-1',
      type: 'sticky',
      x: 150,
      y: 200,
      width: 140,
      height: 140,
      strokeColor: '#fef08a',
      fillColor: '#fef08a',
      strokeWidth: 1,
      text: 'Architecture Review Notes',
      authorId: 'user-a',
      authorName: 'Alice',
      createdAt: 2000,
      updatedAt: 2000,
    };

    engineA.addElement(sticky);

    // Engine B receives update via CRDT
    const elementsOnB = engineB.getElements();
    expect(elementsOnB.length).toBe(1);
    expect(elementsOnB[0]?.id).toBe('sticky-1');
    expect(elementsOnB[0]?.text).toBe('Architecture Review Notes');
  });

  it('synchronizes element updates without conflicts', () => {
    engineA.bindDataChannel('peer-b', channelA as unknown as RTCDataChannel);
    engineB.bindDataChannel('peer-a', channelB as unknown as RTCDataChannel);

    const el: WhiteboardElement = {
      id: 'circle-1',
      type: 'circle',
      x: 50,
      y: 50,
      width: 60,
      height: 60,
      strokeColor: '#ec4899',
      strokeWidth: 4,
      authorId: 'user-a',
      authorName: 'Alice',
      createdAt: 3000,
      updatedAt: 3000,
    };

    engineA.addElement(el);
    expect(engineB.getElements()[0]?.width).toBe(60);

    // Peer B modifies position
    engineB.updateElement('circle-1', { x: 120, y: 140 });

    expect(engineA.getElements()[0]?.x).toBe(120);
    expect(engineA.getElements()[0]?.y).toBe(140);
  });

  it('streams real-time participant cursors', () => {
    const cursorListenerB = vi.fn();
    engineB.subscribeCursors(cursorListenerB);

    engineA.bindDataChannel('peer-b', channelA as unknown as RTCDataChannel);
    engineB.bindDataChannel('peer-a', channelB as unknown as RTCDataChannel);

    engineA.sendCursor(250, 380, 'pen');

    expect(cursorListenerB).toHaveBeenCalled();
    const lastCall = cursorListenerB.mock.calls[cursorListenerB.mock.calls.length - 1];
    expect(lastCall?.[0]?.length).toBe(1);
    expect(lastCall?.[0]?.[0]?.userId).toBe('user-a');
    expect(lastCall?.[0]?.[0]?.x).toBe(250);
    expect(lastCall?.[0]?.[0]?.y).toBe(380);
    expect(lastCall?.[0]?.[0]?.activeTool).toBe('pen');
  });

  it('clears board across peers', () => {
    engineA.bindDataChannel('peer-b', channelA as unknown as RTCDataChannel);
    engineB.bindDataChannel('peer-a', channelB as unknown as RTCDataChannel);

    engineA.addElement({
      id: 'line-1',
      type: 'line',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      authorId: 'user-a',
      authorName: 'Alice',
      createdAt: 4000,
      updatedAt: 4000,
    });

    expect(engineB.getElements().length).toBe(1);

    engineA.clearBoard();

    expect(engineA.getElements().length).toBe(0);
    expect(engineB.getElements().length).toBe(0);
  });
});
