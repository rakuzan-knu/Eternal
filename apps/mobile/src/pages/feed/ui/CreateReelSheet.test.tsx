// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { CreateReelSheet } from './CreateReelSheet';

const mocks = vi.hoisted(() => ({ post: vi.fn(), session: vi.fn(), picker: vi.fn() }));
vi.mock('@/shared/api/client', () => ({
  getMobileApi: () => ({ post: mocks.post }),
  assertSession: mocks.session,
}));
vi.mock('@social-network/shared-stores', () => ({
  useAuthStore: { getState: () => ({ refreshToken: 'refresh' }) },
}));
vi.mock('expo-image-picker', () => ({ launchImageLibraryAsync: mocks.picker }));
vi.mock('lucide-react-native', () => ({ Film: () => null, UploadCloud: () => null }));
vi.mock('../api/postForm', () => ({
  reelForm: async (asset: { uri: string }, fields: { caption: string }) => {
    const body = new FormData();
    body.append('video', asset.uri);
    body.append('caption', fields.caption);
    return body;
  },
}));
vi.mock('./MediaGallery', () => ({ Video: ({ uri }: { uri: string }) => <div>{uri}</div> }));
vi.mock('react-native', () => {
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View,
    Text: View,
    ScrollView: View,
    StyleSheet: { create: (styles: unknown) => styles },
    Platform: { OS: 'web' },
    Pressable: ({
      children,
      onPress,
      disabled,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      onPress: () => void;
      disabled: boolean;
      accessibilityLabel: string;
    }) => (
      <button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress}>
        {children}
      </button>
    ),
    TextInput: ({
      value,
      onChangeText,
      editable,
      accessibilityLabel,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      editable: boolean;
      accessibilityLabel: string;
    }) => (
      <textarea
        aria-label={accessibilityLabel}
        value={value}
        disabled={!editable}
        onInput={(event) => onChangeText(event.currentTarget.value)}
        onChange={() => {}}
      />
    ),
  };
});
vi.mock('./primitives', () => ({
  colors: {},
  common: {},
  ErrorNotice: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  Sheet: ({
    children,
    onClose,
    closeDisabled,
  }: {
    children: React.ReactNode;
    onClose: () => void;
    closeDisabled: boolean;
  }) => (
    <div>
      <button onClick={onClose} disabled={closeDisabled}>
        Close
      </button>
      {children}
    </div>
  ),
}));
vi.mock('@/shared/ui', () => ({
  Button: ({
    title,
    onPress,
    disabled,
    loading,
  }: {
    title: string;
    onPress: () => void;
    disabled: boolean;
    loading: boolean;
  }) => (
    <button onClick={onPress} disabled={disabled || loading}>
      {title}
    </button>
  ),
}));

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => {
  await dispose?.();
  vi.resetAllMocks();
});

async function setup(isOnline = true) {
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onPublished = vi.fn();
  const onClose = vi.fn();
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <CreateReelSheet
          userId="viewer"
          isOnline={isOnline}
          onClose={onClose}
          onPublished={onPublished}
        />
      </QueryClientProvider>,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    client.clear();
    element.remove();
  };
  const button = (name: string) => {
    const found = Array.from(element.querySelectorAll('button')).find(
      (item) => item.textContent === name || item.getAttribute('aria-label') === name,
    );
    if (!found) throw new Error(`Missing button: ${name}`);
    return found;
  };
  const click = async (name: string) =>
    act(async () => {
      button(name).click();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  const caption = () => {
    const input = element.querySelector<HTMLTextAreaElement>('[aria-label="Reel caption"]');
    if (!input) throw new Error('Missing caption');
    return input;
  };
  return { element, button, click, caption, onPublished, onClose };
}

it('blocks duplicate submission and closing, retains failed upload, and publishes after retry', async () => {
  mocks.picker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'video.mp4', type: 'video' }],
  });
  let rejectUpload: (reason: Error) => void = () => {
    throw new Error('Upload not started');
  };
  mocks.post
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectUpload = reject;
        }),
    )
    .mockResolvedValueOnce({ data: { id: 'reel-1' } });
  const editor = await setup();
  await editor.click('Choose reel video');
  await act(async () => {
    editor.caption().value = 'My reel';
    editor.caption().dispatchEvent(new Event('input', { bubbles: true }));
  });
  await editor.click('Publish reel');
  expect(editor.button('Close').disabled).toBe(true);
  expect(editor.button('Publish reel').disabled).toBe(true);
  await editor.click('Publish reel');
  expect(mocks.post).toHaveBeenCalledOnce();
  await act(async () => {
    rejectUpload(new Error('Unavailable'));
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(editor.element.querySelector('[role="alert"]')?.textContent).toContain('still here');
  expect(editor.caption().value).toBe('My reel');
  expect(editor.onPublished).not.toHaveBeenCalled();
  await editor.click('Publish reel');
  expect(mocks.post.mock.calls[1]?.[1].get('video')).toBe('video.mp4');
  expect(mocks.post.mock.calls[1]?.[1].get('caption')).toBe('My reel');
  expect(mocks.session).toHaveBeenCalledWith('viewer', 'refresh');
  expect(editor.onPublished).toHaveBeenCalledOnce();
});

it('rejects files over the actual backend upload limit before uploading', async () => {
  mocks.picker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'large.mp4', type: 'video', fileSize: 101 * 1024 * 1024 }],
  });
  const editor = await setup();
  await editor.click('Choose reel video');
  expect(editor.element.textContent).toContain('smaller than 100 MB');
  expect(editor.button('Publish reel').disabled).toBe(true);
  expect(mocks.post).not.toHaveBeenCalled();
});

it('blocks picker, caption changes, and publication while offline', async () => {
  const editor = await setup(false);
  await editor.click('Choose reel video');
  await editor.click('Publish reel');
  expect(editor.caption().disabled).toBe(true);
  expect(mocks.picker).not.toHaveBeenCalled();
  expect(mocks.post).not.toHaveBeenCalled();
});
