import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { DocumentPiP } from '../DocumentPiP';
import { isDocumentPiPSupported } from '../../../lib/documentPiP';
import { useCallStore } from '../../../model/callStore';

describe('DocumentPiP Component (Document Picture-in-Picture API)', () => {
  let mockPipWindow: Window;

  beforeEach(() => {
    const mockBody = document.createElement('body');
    const mockHead = document.createElement('head');

    mockPipWindow = {
      document: {
        title: '',
        head: mockHead,
        body: mockBody,
        createElement: (tag: string) => document.createElement(tag),
      },
      close: vi.fn(),
      closed: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    window.documentPictureInPicture = {
      requestWindow: vi.fn().mockResolvedValue(mockPipWindow),
      window: null,
    };

    useCallStore.setState({
      isPiP: true,
      callStatus: 'connected',
      remoteParticipant: {
        id: 'u1',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
      remoteStreams: {},
      durationSec: 45,
      isMuted: false,
      isVideoOff: false,
    });
  });

  afterEach(() => {
    delete window.documentPictureInPicture;
    vi.restoreAllMocks();
  });

  it('detects Document PiP API support accurately', () => {
    expect(isDocumentPiPSupported()).toBe(true);
    delete window.documentPictureInPicture;
    expect(isDocumentPiPSupported()).toBe(false);
  });

  it('requests floating document window when isPiP is active and configures styles', async () => {
    render(<DocumentPiP />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(window.documentPictureInPicture?.requestWindow).toHaveBeenCalledWith({
      width: 380,
      height: 250,
    });
    expect(mockPipWindow.document.title).toContain('Alice');
    expect(mockPipWindow.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
  });

  it('resets isPiP to false when floating OS window closes', async () => {
    render(<DocumentPiP />);

    await act(async () => {
      await Promise.resolve();
    });

    // Find the pagehide listener
    const pageHideCalls = (
      mockPipWindow.addEventListener as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.filter((c) => c[0] === 'pagehide');
    expect(pageHideCalls.length).toBeGreaterThan(0);

    const pageHideHandler = pageHideCalls[0][1];
    act(() => {
      pageHideHandler();
    });

    expect(useCallStore.getState().isPiP).toBe(false);
  });
});
