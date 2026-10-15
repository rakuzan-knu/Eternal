import { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CallProvider } from '../CallProvider';
import { useCall } from '../CallContext';

const mocks = vi.hoisted(() => ({
  incoming: new Map<string, (value: unknown) => void>(),
  manager: { initiateCall: vi.fn().mockResolvedValue(undefined) },
  useCallManager: vi.fn(),
  mounted: vi.fn(),
}));
vi.mock('@/shared/api/socket', () => ({
  getSocket: () => ({
    on: (event: string, handler: (value: unknown) => void) => mocks.incoming.set(event, handler),
    off: (event: string, handler: (value: unknown) => void) => {
      if (mocks.incoming.get(event) === handler) mocks.incoming.delete(event);
    },
  }),
}));
vi.mock('../../lib/callSessionPersistence', () => ({ getCallSession: () => null }));
vi.mock('../useCallManager', () => ({
  useCallManager: (...args: unknown[]) => {
    mocks.useCallManager(...args);
    return { ...mocks.manager };
  },
}));

function Shell() {
  useEffect(() => {
    mocks.mounted();
  }, []);
  const manager = useCall();
  return (
    <button
      onClick={() =>
        void manager.initiateCall({
          conversationId: 'chat-1',
          callType: 'audio',
          remoteUser: { id: 'peer', username: 'peer', displayName: 'Peer', avatar: null },
        })
      }
    >
      Start call
    </button>
  );
}
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CallProvider>
        <Shell />
      </CallProvider>
    </MemoryRouter>,
  );
}

describe('CallProvider activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.incoming.clear();
  });

  it('keeps the call runtime inactive on search', () => {
    renderAt('/search');
    expect(mocks.useCallManager).not.toHaveBeenCalled();
    expect(mocks.incoming.has('call:incoming')).toBe(true);
  });

  it('loads the manager on a call click and preserves the mounted shell', async () => {
    renderAt('/search');
    await act(async () => {
      fireEvent.click(screen.getByText('Start call'));
    });
    await waitFor(() =>
      expect(mocks.manager.initiateCall).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'chat-1', callType: 'audio' }),
      ),
    );
    expect(mocks.mounted).toHaveBeenCalledTimes(1);
    expect(mocks.useCallManager.mock.calls.length).toBeLessThan(10);
  });

  it('replays an incoming call after loading without remounting the shell', async () => {
    renderAt('/search');
    const call = { callId: 'incoming-1', conversationId: 'chat-2', callType: 'audio' };
    await act(async () => {
      mocks.incoming.get('call:incoming')?.(call);
    });
    await waitFor(() => expect(mocks.useCallManager).toHaveBeenCalledWith(call));
    expect(mocks.mounted).toHaveBeenCalledTimes(1);
  });

  it('activates on the messenger route', async () => {
    renderAt('/messages');
    await waitFor(() => expect(mocks.useCallManager).toHaveBeenCalled());
    expect(mocks.mounted).toHaveBeenCalledTimes(1);
  });

  it('stable delegates invoke the latest runtime action', async () => {
    const { rerender } = renderAt('/messages');
    await waitFor(() => expect(mocks.useCallManager).toHaveBeenCalled());
    const original = mocks.manager.initiateCall;
    const latest = vi.fn().mockResolvedValue(undefined);
    mocks.manager.initiateCall = latest;
    try {
      await act(async () => {
        rerender(
          <MemoryRouter initialEntries={['/messages']}>
            <CallProvider>
              <Shell />
            </CallProvider>
          </MemoryRouter>,
        );
      });
      fireEvent.click(screen.getByText('Start call'));
      await waitFor(() => expect(latest).toHaveBeenCalled());
      expect(original).not.toHaveBeenCalled();
      expect(mocks.mounted).toHaveBeenCalledTimes(1);
    } finally {
      mocks.manager.initiateCall = original;
    }
  });
});
