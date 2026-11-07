import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestDataPackageModal } from '../RequestDataPackageModal';
import { prepareDataExport, saveDataExport } from '../../../api/dataExportApi';
import { useLanguageStore } from '@/shared/lib/language/languageStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

vi.mock('../../../api/dataExportApi', () => ({
  prepareDataExport: vi.fn(),
  saveDataExport: vi.fn(),
}));

function enterPassword() {
  fireEvent.change(screen.getByLabelText('Current password'), {
    target: { value: 'PrivatePassword123!' },
  });
}

describe('RequestDataPackageModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ currentLanguage: 'English' });
    useAuthStore.setState({ userId: 'export-owner', isAuthenticated: true });
  });

  it('exposes only implemented categories and explains the unencrypted subset', () => {
    render(<RequestDataPackageModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Download your Eternal data' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
    expect(screen.getByText(/Media files, stories, reels/)).toBeInTheDocument();
    expect(screen.getByText(/downloaded file is not encrypted/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeDisabled();
    expect(screen.getByLabelText('Current password')).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Current password')).toHaveAttribute('type', 'text');
  });

  it('requires a password and at least one selected category', () => {
    render(<RequestDataPackageModal isOpen onClose={vi.fn()} />);
    enterPassword();
    fireEvent.click(screen.getByRole('button', { name: 'Deselect all' }));
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Account information' }));
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeEnabled();
  });

  it('waits for the real export before starting the browser download', async () => {
    let complete: ((file: Blob) => void) | undefined;
    vi.mocked(prepareDataExport).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    render(<RequestDataPackageModal isOpen onClose={vi.fn()} />);
    enterPassword();
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect(saveDataExport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Preparing' })).toBeDisabled();
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    const file = new Blob(['{}']);
    await act(async () => complete?.(file));
    expect(saveDataExport).toHaveBeenCalledWith(file);
    expect(screen.getByRole('status')).toHaveTextContent('Your browser download has started');
  });

  it('keeps failures actionable without exposing raw errors or claiming success', async () => {
    vi.mocked(prepareDataExport).mockRejectedValue(new Error('private payload or password'));
    render(<RequestDataPackageModal isOpen onClose={vi.fn()} />);
    enterPassword();
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No partial file was downloaded');
    expect(screen.queryByText('private payload or password')).not.toBeInTheDocument();
    expect(saveDataExport).not.toHaveBeenCalled();
  });

  it('cancels pending export on dismissal and ignores its late response', async () => {
    let complete: ((file: Blob) => void) | undefined;
    let signal: AbortSignal | undefined;
    vi.mocked(prepareDataExport).mockImplementation((options) => {
      signal = options.signal;
      return new Promise((resolve) => {
        complete = resolve;
      });
    });
    const onClose = vi.fn();
    render(<RequestDataPackageModal isOpen onClose={onClose} />);
    enterPassword();
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(signal?.aborted).toBe(true);
    await act(async () => complete?.(new Blob(['{}'])));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(saveDataExport).not.toHaveBeenCalled();
  });

  it('cancels and clears sensitive state when the active identity changes', async () => {
    let complete: ((file: Blob) => void) | undefined;
    let signal: AbortSignal | undefined;
    vi.mocked(prepareDataExport).mockImplementation((options) => {
      signal = options.signal;
      return new Promise((resolve) => {
        complete = resolve;
      });
    });
    render(<RequestDataPackageModal isOpen onClose={vi.fn()} />);
    enterPassword();
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    act(() => useAuthStore.setState({ userId: 'different-owner' }));
    expect(signal?.aborted).toBe(true);
    await act(async () => complete?.(new Blob(['{}'])));
    expect(saveDataExport).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });

  it('supports Ukrainian and renders nothing when closed', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    const { rerender } = render(<RequestDataPackageModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Завантажити дані Eternal' })).toBeInTheDocument();
    rerender(<RequestDataPackageModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
