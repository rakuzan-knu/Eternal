import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SEED_REELS } from '@/entities/reel';
import type { ReelDirectMessageSender } from '../ReelSendFriendsModal';
import { ReelShareModal } from '../ReelShareModal';

const { recordShare, friendsProps } = vi.hoisted(() => ({
  recordShare: vi.fn(),
  friendsProps: vi.fn(),
}));

vi.mock('../../api/reelsApi', () => ({
  useRecordReelShare: () => ({ mutate: recordShare }),
}));
vi.mock('../ReelSendFriendsModal', () => ({
  ReelSendFriendsModal: (props: { isOpen: boolean; sendMessage?: ReelDirectMessageSender }) => {
    friendsProps(props);
    return props.isOpen ? <p>Choose friends</p> : null;
  },
}));

const reel = DEFAULT_SEED_REELS[0];
const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalExecCommand) Object.defineProperty(document, 'execCommand', originalExecCommand);
  else Reflect.deleteProperty(document, 'execCommand');
});

function openShare() {
  const onClose = vi.fn();
  const sendMessage = vi.fn<ReelDirectMessageSender>();
  render(<ReelShareModal reel={reel} isOpen onClose={onClose} sendMessage={sendMessage} />);
  return { onClose, sendMessage };
}

describe('ReelShareModal action integrity', () => {
  it('retains all share destinations and explains repost availability without claiming success', () => {
    const { onClose, sendMessage } = openShare();
    for (const name of [
      'Repost',
      'Send to Friends',
      'Download',
      'WhatsApp',
      'Embed',
      'Facebook',
      'Telegram',
      'X (Twitter)',
      'Viber',
      'Message',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Repost' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reposting to your feed is not available yet. Choose Send to Friends',
    );
    expect(recordShare).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send to Friends' }));
    expect(screen.getByText('Choose friends')).toBeInTheDocument();
    expect(friendsProps).toHaveBeenLastCalledWith(expect.objectContaining({ sendMessage }));
  });

  it.each(['Copy', 'Message'])(
    'does not claim a copy or record a share when the %s clipboard fallback fails',
    async (action) => {
      vi.stubGlobal('isSecureContext', false);
      const copy = vi.fn().mockReturnValue(false);
      Object.defineProperty(document, 'execCommand', { configurable: true, value: copy });
      openShare();
      await act(async () => {
        fireEvent.click(screen.getAllByRole('button', { name: action })[0]);
      });
      expect(copy).toHaveBeenCalledWith('copy');
      expect(screen.getByRole('status')).toHaveTextContent('Failed to copy link');
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      expect(document.querySelector('textarea')).not.toBeInTheDocument();
      expect(recordShare).not.toHaveBeenCalled();
    },
  );

  it('acknowledges a successful fallback copy and removes its temporary textarea', async () => {
    vi.stubGlobal('isSecureContext', false);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockImplementation(() => {
        expect(document.activeElement).toBeInstanceOf(HTMLTextAreaElement);
        return true;
      }),
    });
    openShare();
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Link copied!');
    expect(recordShare).toHaveBeenCalledWith(reel.id);
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
  });

  it('does not save an HTTP error response as a video or record a download', async () => {
    const blob = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, blob }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    openShare();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Could not download video. Try again.');
    expect(blob).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(recordShare).not.toHaveBeenCalled();
  });

  it('reports a network download failure without opening an unverified fallback URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    openShare();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Could not download video');
    expect(click).not.toHaveBeenCalled();
    expect(recordShare).not.toHaveBeenCalled();
  });

  it('starts a download only after receiving a successful video response', async () => {
    const video = new Blob(['video'], { type: 'video/mp4' });
    const fetchVideo = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(video) });
    vi.stubGlobal('fetch', fetchVideo);
    const createUrl = vi.fn().mockReturnValue('blob:video');
    const revokeUrl = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createUrl;
        static revokeObjectURL = revokeUrl;
      },
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    openShare();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    });
    expect(fetchVideo).toHaveBeenCalledWith(reel.videoUrl);
    expect(createUrl).toHaveBeenCalledWith(video);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith('blob:video');
    expect(recordShare).toHaveBeenCalledWith(reel.id);
    expect(screen.getByRole('status')).toHaveTextContent('Download started');
  });

  it('reports blocked external share windows without recording a share', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    openShare();
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }));
    expect(screen.getByRole('status')).toHaveTextContent('Share window blocked');
    expect(recordShare).not.toHaveBeenCalled();
  });

  it('records an external-share launch only when the window opens', () => {
    vi.spyOn(window, 'open').mockReturnValue(window);
    openShare();
    fireEvent.click(screen.getByRole('button', { name: 'Telegram' }));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://t.me/share/url?url='),
      '_share_telegram',
      expect.any(String),
    );
    expect(recordShare).toHaveBeenCalledWith(reel.id);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses the canonical dialog keyboard handling and restores focus to its opener', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open sharing';
    document.body.appendChild(opener);
    opener.focus();
    const { onClose } = openShare();
    expect(screen.getByRole('dialog', { name: 'Share' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    await act(() => new Promise((resolve) => setTimeout(resolve, 220)));
    expect(onClose).toHaveBeenCalledOnce();
    cleanup();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
