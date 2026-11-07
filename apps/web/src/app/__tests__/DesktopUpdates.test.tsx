import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateState } from '../../../../desktop/src/shared/updates';
import { DesktopUpdates } from '../DesktopUpdates';
import { useLanguageStore } from '@/shared/lib/language/languageStore';

const bridge = {
  getUpdateState: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  openUpdateDownload: vi.fn(),
};
let state: UpdateState;
beforeEach(() => {
  vi.clearAllMocks();
  state = {
    currentVersion: '1.0.0',
    channel: 'stable',
    mode: 'automatic',
    status: 'available',
    latestVersion: '1.1.0',
    minVersion: '1.0.0',
    required: false,
    progress: null,
    error: null,
    minimumCheckFailed: false,
  };
  bridge.getUpdateState.mockImplementation(async () => ({ ...state }));
  bridge.downloadUpdate.mockResolvedValue(state);
  bridge.checkForUpdates.mockResolvedValue(state);
  bridge.installUpdate.mockResolvedValue(undefined);
  bridge.openUpdateDownload.mockResolvedValue(undefined);
  useLanguageStore.setState({ currentLanguage: 'English' });
  vi.stubGlobal('desktop', bridge);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('desktop update banner', () => {
  it('supports older shells without update capabilities', async () => {
    vi.stubGlobal('desktop', { getInfo: vi.fn() });
    const { container } = render(<DesktopUpdates />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });
  it('does not show a banner or download automatically for idle/development clients', async () => {
    state.status = 'idle';
    state.latestVersion = null;
    render(<DesktopUpdates />);
    await waitFor(() => expect(bridge.getUpdateState).toHaveBeenCalled());
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(bridge.downloadUpdate).not.toHaveBeenCalled();
  });
  it('checks once in StrictMode and prevents duplicate download submissions', async () => {
    let finish: () => void = () => {};
    bridge.downloadUpdate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <StrictMode>
        <DesktopUpdates />
      </StrictMode>,
    );
    const button = await screen.findByRole('button', { name: 'Download update' });
    expect(bridge.getUpdateState).toHaveBeenCalledTimes(1);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(bridge.downloadUpdate).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    state.status = 'downloaded';
    finish();
    await screen.findByRole('button', { name: 'Restart and install' });
  });
  it('shows a manual download action for macOS/deb/rpm', async () => {
    state.mode = 'manual';
    render(<DesktopUpdates />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open download page' }));
    await waitFor(() => expect(bridge.openUpdateDownload).toHaveBeenCalledTimes(1));
    expect(bridge.downloadUpdate).not.toHaveBeenCalled();
  });
  it('keeps failed installation recoverable and reports errors without losing the ready update', async () => {
    state.status = 'downloaded';
    bridge.installUpdate.mockRejectedValueOnce(new Error('End your call'));
    render(<DesktopUpdates />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restart and install' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('finish any active call');
    expect(screen.getByRole('button', { name: 'Restart and install' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Restart and install' }));
    await waitFor(() => expect(bridge.installUpdate).toHaveBeenCalledTimes(2));
  });
  it('localizes the required status and does not allow dismissing it', async () => {
    state.required = true;
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    render(<DesktopUpdates />);
    expect(await screen.findByRole('status')).toHaveTextContent('Потрібне оновлення');
    expect(screen.queryByRole('button', { name: 'Пізніше' })).not.toBeInTheDocument();
  });
  it('shows bounded progress and lets the user defer an optional update', async () => {
    state.status = 'downloading';
    state.progress = 42;
    render(<DesktopUpdates />);
    expect(await screen.findByRole('progressbar')).toHaveAttribute('value', '42');
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
