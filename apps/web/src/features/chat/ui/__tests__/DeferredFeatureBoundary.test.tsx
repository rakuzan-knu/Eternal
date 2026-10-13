import React, { Component, lazy, useState, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeferredFeatureBoundary } from '../DeferredFeatureBoundary';

afterEach(() => vi.restoreAllMocks());

describe('deferred chat feature isolation', () => {
  it('shows cancellable progress while a modal chunk loads and restores focus', () => {
    const Pending = lazy(() => new Promise<{ default: React.ComponentType }>(() => {}));
    function Chat() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <input aria-label="Draft" defaultValue="Preserved draft" />
          <button onClick={() => setOpen(true)}>Open editor</button>
          {open && (
            <DeferredFeatureBoundary label="image editor" onClose={() => setOpen(false)}>
              <Pending />
            </DeferredFeatureBoundary>
          )}
        </>
      );
    }
    render(<Chat />);
    const trigger = screen.getByRole('button', { name: 'Open editor' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('status')).toHaveTextContent('Loading image editor');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('Preserved draft');
  });

  it('keeps failed chunks local so closing the error preserves the chat and draft', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Failed = lazy(() => Promise.reject(new Error('Chunk request failed')));
    const rootFailure = vi.fn();
    class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      componentDidCatch() {
        rootFailure();
      }
      render() {
        return this.state.failed ? <p>Application unavailable</p> : this.props.children;
      }
    }
    function Chat() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <input aria-label="Draft" defaultValue="Draft before chunk failure" />
          {open && (
            <DeferredFeatureBoundary label="document preview" onClose={() => setOpen(false)}>
              <Failed />
            </DeferredFeatureBoundary>
          )}
        </>
      );
    }
    render(
      <AppBoundary>
        <Chat />
      </AppBoundary>,
    );
    await screen.findByRole('alert');
    expect(rootFailure).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue(
      'Draft before chunk failure',
    );
  });

  it('renders panel progress in place and releases its Escape handler on unmount', () => {
    const Pending = lazy(() => new Promise<{ default: React.ComponentType }>(() => {}));
    const close = vi.fn();
    const { unmount } = render(
      <DeferredFeatureBoundary label="chat search" presentation="panel" onClose={close}>
        <Pending />
      </DeferredFeatureBoundary>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading chat search');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });

  it('replaces pending UI with the loaded feature when the chunk resolves', async () => {
    let resolve!: (module: { default: React.ComponentType }) => void;
    const Loaded = lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((done) => {
          resolve = done;
        }),
    );
    render(
      <DeferredFeatureBoundary label="video editor" onClose={vi.fn()}>
        <Loaded />
      </DeferredFeatureBoundary>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () => resolve({ default: () => <p>Editor ready</p> }));
    expect(screen.getByText('Editor ready')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
