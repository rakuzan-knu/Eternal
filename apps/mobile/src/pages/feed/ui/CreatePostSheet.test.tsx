// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { CreatePostEditor, emptyPostDraft } from './CreatePostSheet';

const api = vi.hoisted(() => ({ create: vi.fn(), assertSession: vi.fn() }));
vi.mock('../api/feedApi', () => ({ feedApi: api }));
vi.mock('@/shared/api/client', () => ({ assertSession: api.assertSession }));
vi.mock('@social-network/shared-stores', () => ({
  useAuthStore: { getState: () => ({ refreshToken: 'refresh' }) },
}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('../api/postForm', () => ({
  postForm: async (text: string) => {
    const form = new FormData();
    form.append('content', text);
    return form;
  },
}));
vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    ['BarChart3', 'Paperclip', 'Plus', 'X', 'Edit3', 'Eye'].map((name) => [name, () => null]),
  ),
);
vi.mock('react-native', async () => {
  const React = await import('react');
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View,
    Text: View,
    ScrollView: View,
    Image: () => null,
    Platform: { OS: 'web' },
    StyleSheet: { create: (styles: unknown) => styles },
    Pressable: ({
      children,
      onPress,
      disabled,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      onPress: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
    }) => (
      <button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress}>
        {children}
      </button>
    ),
    TextInput: ({
      value,
      onChangeText,
      accessibilityLabel,
      editable,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      accessibilityLabel: string;
      editable: boolean;
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
vi.mock('./primitives', async () => {
  const React = await import('react');
  return {
    colors: {},
    common: {},
    Avatar: () => null,
    Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    IconButton: ({
      children,
      label,
      onPress,
      disabled,
    }: {
      children?: React.ReactNode;
      label: string;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <button aria-label={label} onClick={onPress} disabled={disabled}>
        {children}
      </button>
    ),
    ErrorNotice: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  };
});
vi.mock('@/shared/ui', () => ({ Button: () => null }));

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => {
  await dispose?.();
  vi.clearAllMocks();
});
async function setup(isOnline = true) {
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  let remountEditor = () => {};
  function Harness() {
    const draftState = React.useState(emptyPostDraft);
    const [revision, setRevision] = React.useState(0);
    remountEditor = () => setRevision((current) => current + 1);
    return (
      <CreatePostEditor
        key={revision}
        user={{ id: 'viewer', username: 'alex' }}
        inline
        isOnline={isOnline}
        draftState={draftState}
        onClose={onClose}
      />
    );
  }
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    client.clear();
    element.remove();
  };
  const button = (name: string) => {
    const match = Array.from(element.querySelectorAll('button')).find(
      (item) => item.getAttribute('aria-label') === name || item.textContent === name,
    );
    if (!match) throw new Error(`Missing button: ${name}`);
    return match;
  };
  const input = () => {
    const match = element.querySelector('textarea');
    if (!match) throw new Error('Missing editor');
    return match;
  };
  const write = async (text: string) => {
    await act(async () => {
      input().value = text;
      input().dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const click = async (name: string) => {
    await act(async () => {
      button(name).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  return {
    element,
    input,
    write,
    click,
    onClose,
    remount: async () => {
      await act(async () => remountEditor());
    },
  };
}

it('keeps the inline draft after a failed publish and clears it only after successful retry', async () => {
  api.create.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ id: 'post' });
  const editor = await setup();
  await editor.write('Keep this draft');
  await editor.click('Publish post');
  expect(editor.input().value).toBe('Keep this draft');
  expect(editor.element.querySelector('[role="alert"]')?.textContent).toContain(
    'Your draft is still here',
  );
  expect(editor.onClose).not.toHaveBeenCalled();
  await editor.click('Publish post');
  expect(api.assertSession).toHaveBeenCalledWith('viewer', 'refresh');
  expect(api.create.mock.calls[1]?.[0].get('content')).toBe('Keep this draft');
  expect(editor.input().value).toBe('');
  expect(editor.onClose).toHaveBeenCalledOnce();
});

it('preserves the draft when switching between Write and Preview', async () => {
  const editor = await setup();
  await editor.write('A familiar feed');
  await editor.click('Preview');
  expect(editor.element.querySelector('textarea')).toBeNull();
  expect(editor.element.textContent).toContain('A familiar feed');
  await editor.click('Write');
  expect(editor.input().value).toBe('A familiar feed');
  expect(api.create).not.toHaveBeenCalled();
});

it('keeps the shared draft when the feed editor remounts after switching sections', async () => {
  const editor = await setup();
  await editor.write('Saved must not discard this');
  await editor.remount();
  expect(editor.input().value).toBe('Saved must not discard this');
});

it('disables input and publishing while offline', async () => {
  const editor = await setup(false);
  expect(editor.input().disabled).toBe(true);
  await editor.click('Publish post');
  expect(api.create).not.toHaveBeenCalled();
});
