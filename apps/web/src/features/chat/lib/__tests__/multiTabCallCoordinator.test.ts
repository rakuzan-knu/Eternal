import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiTabCallCoordinator } from '../webrtc/multiTabCallCoordinator';

describe('MultiTabCallCoordinator (Web Locks API + BroadcastChannel)', () => {
  let mockChannels: Map<
    string,
    Array<{ onmessage?: ((e: any) => void) | null; postMessage: (msg: any) => void }>
  >;

  beforeEach(() => {
    mockChannels = new Map();

    // Mock BroadcastChannel
    vi.stubGlobal(
      'BroadcastChannel',
      class MockBroadcastChannel {
        name: string;
        onmessage: ((e: any) => void) | null = null;

        constructor(name: string) {
          this.name = name;
          if (!mockChannels.has(name)) {
            mockChannels.set(name, []);
          }
          mockChannels.get(name)!.push(this);
        }

        postMessage(data: any) {
          const peers = mockChannels.get(this.name) || [];
          for (const peer of peers) {
            if (peer !== this && peer.onmessage) {
              peer.onmessage({ data });
            }
          }
        }

        close() {
          const list = mockChannels.get(this.name) || [];
          mockChannels.set(
            this.name,
            list.filter((c) => c !== this),
          );
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to MASTER when Web Locks API is unavailable', async () => {
    const coordinator = new MultiTabCallCoordinator();
    const role = await coordinator.coordinateCall('call-123');

    expect(role).toBe('MASTER');
    expect(coordinator.isLeader()).toBe(true);
    coordinator.stop();
  });

  it('coordinates leader election via simulated Web Locks API', async () => {
    let activeLockHolder: (() => void) | null = null;
    const lockQueue: Array<() => void> = [];

    const mockNavigator = {
      locks: {
        request: vi
          .fn()
          .mockImplementation((name: string, options: any, callback: () => Promise<void>) => {
            return new Promise<void>((resolve) => {
              const run = async () => {
                await callback();
                resolve();
              };

              if (!activeLockHolder) {
                activeLockHolder = run;
                run();
              } else {
                lockQueue.push(run);
              }
            });
          }),
      },
    };

    vi.stubGlobal('navigator', mockNavigator);

    const tabA = new MultiTabCallCoordinator();
    const tabB = new MultiTabCallCoordinator();

    await tabA.coordinateCall('room-99');
    await tabB.coordinateCall('room-99');

    expect(tabA.getRole()).toBe('MASTER');
    expect(tabB.getRole()).toBe('SLAVE');

    tabA.stop();
    tabB.stop();
  });

  it('suppresses ringtone on slave tab when master announces ringing', async () => {
    const tabA = new MultiTabCallCoordinator();
    const tabB = new MultiTabCallCoordinator();

    // Tab A is MASTER
    await tabA.coordinateCall('call-456');
    // Force Tab B to SLAVE for this test
    tabB['role'] = 'SLAVE';
    tabB['currentCallId'] = 'call-456';
    tabB['initBroadcastChannel']('call-456');

    expect(tabB.shouldSuppressRingtone()).toBe(false);

    // Master announces ringing
    tabA.announceRinging();

    expect(tabB.shouldSuppressRingtone()).toBe(true);

    tabA.stop();
    tabB.stop();
  });

  it('delegates slave user actions (e.g. Accept) to master tab', async () => {
    const onRemoteCommand = vi.fn();
    const masterTab = new MultiTabCallCoordinator({ onRemoteCommand });
    const slaveTab = new MultiTabCallCoordinator();

    await masterTab.coordinateCall('call-789');
    slaveTab['role'] = 'SLAVE';
    slaveTab['currentCallId'] = 'call-789';
    slaveTab['initBroadcastChannel']('call-789');

    slaveTab.sendSlaveAction('ACCEPT');

    expect(onRemoteCommand).toHaveBeenCalledWith('ACCEPT');

    masterTab.stop();
    slaveTab.stop();
  });
});
