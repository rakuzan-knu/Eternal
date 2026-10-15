// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { CreateStory } from './CreateStory';
import type { StoryViewResponse } from '@social-network/shared-contracts';

const mocks = vi.hoisted(() => ({ post: vi.fn(), session: vi.fn(), picker: vi.fn() }));
vi.mock('@/shared/api/client', () => ({
  getMobileApi: () => ({
    post: (path: string, ...args: unknown[]) =>
      path === '/uploads/direct'
        ? Promise.resolve({ data: { mode: 'proxy' } })
        : mocks.post(path, ...args),
  }),
  assertSession: mocks.session,
}));
vi.mock('@social-network/shared-stores', () => ({
  useAuthStore: { getState: () => ({ refreshToken: 'refresh' }) },
}));
vi.mock('expo-image-picker', () => ({ launchImageLibraryAsync: mocks.picker }));
vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    [
      'ArrowRight',
      'AtSign',
      'BarChart2',
      'ChevronDown',
      'Image',
      'Layers',
      'Music',
      'Palette',
      'Pencil',
      'Smile',
      'Sparkles',
      'Star',
      'Trash2',
      'Type',
      'X',
      'Check',
    ].map((name) => [name, () => null]),
  ),
);
vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }));
vi.mock('../api/storyPalette', () => ({ extractStoryPalette: vi.fn().mockResolvedValue(null) }));
vi.mock('./StoryFonts', () => ({ useStoryFonts: () => [true, null] }));
vi.mock('./StoryCanvas', () => ({
  StoryBackground: () => null,
  StoryImage: ({ label }: { label: string }) => <div aria-label={label} />,
  StoryLayer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StoryText: ({ overlay }: { overlay: { text: string } }) => <div>{overlay.text}</div>,
  MusicSticker: () => null,
}));
vi.mock('./StoryDrawing', () => ({ StoryDrawing: () => null }));
vi.mock('./StoryDrawingEditor', () => ({ StoryDrawingEditor: () => null }));
vi.mock('./StoryVideo', () => ({ StoryVideo: () => null }));
vi.mock('./StoryAudio', () => ({ StoryAudio: () => null }));
vi.mock('./StoryMusicEditor', () => ({
  StoryMusicEditor: () => null,
  StoryMusicPlayer: () => null,
}));
vi.mock('@react-native-community/slider', () => ({
  default: ({
    accessibilityLabel,
    value,
    onValueChange,
  }: {
    accessibilityLabel: string;
    value: number;
    onValueChange: (value: number) => void;
  }) => (
    <input
      type="range"
      aria-label={accessibilityLabel}
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
    />
  ),
}));
vi.mock('react-native', () => {
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View,
    ActivityIndicator: () => null,
    BackHandler: { addEventListener: () => ({ remove: () => {} }) },
    Image: ({ accessibilityLabel }: { accessibilityLabel: string }) => (
      <div aria-label={accessibilityLabel} />
    ),
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
  Avatar: () => null,
  IconButton: ({
    label,
    disabled,
    onPress,
    children,
  }: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
    children: React.ReactNode;
  }) => (
    <button aria-label={label} disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
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

async function setup(isOnline = true, embedded = false) {
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <CreateStory userId="viewer" isOnline={isOnline} onClose={onClose} embedded={embedded} />
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
    const input = element.querySelector<HTMLTextAreaElement>('[aria-label="Story caption"]');
    if (!input) throw new Error('Missing caption');
    return input;
  };
  return { element, button, click, caption, onClose, client };
}

const story: StoryViewResponse = {
  id: 'created',
  authorId: 'viewer',
  author: { id: 'viewer', username: 'alex', displayName: 'Alex', avatar: null },
  mediaType: 'IMAGE',
  mediaUrl: 'photo.jpg',
  caption: 'My moment',
  privacy: 'ALL_FOLLOWERS',
  overlays: null,
  createdAt: '2026-10-05T12:00:00Z',
  expiresAt: '2026-10-06T12:00:00Z',
  viewsCount: 0,
  hasViewed: true,
  userReaction: null,
  reactionsCount: {},
  pollResult: null,
};
for (const embedded of [false, true]) {
  it(`preserves a failed story upload and publishes with the chosen audience (${embedded ? 'Create menu' : 'Feed'})`, async () => {
    mocks.picker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'photo.jpg',
          type: 'image',
          width: 900,
          height: 1600,
          file: new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' }),
        },
      ],
    });
    mocks.post
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce({ data: story });
    const editor = await setup(true, embedded);
    await editor.click('Choose photo or video');
    await editor.click('Choose photo or video');
    await act(async () => {
      editor.caption().value = 'My moment';
      editor.caption().dispatchEvent(new Event('input', { bubbles: true }));
    });
    await editor.click('Share to close friends');
    expect(editor.onClose).not.toHaveBeenCalled();
    expect(editor.caption().value).toBe('My moment');
    expect(editor.element.querySelector('[role="alert"]')?.textContent).toContain('still here');
    await editor.click('Share story');
    expect(mocks.post.mock.calls[1]?.[1].get('file')).toBeInstanceOf(File);
    expect(mocks.post.mock.calls[1]?.[1].get('caption')).toBe('My moment');
    expect(mocks.post.mock.calls[1]?.[1].get('privacy')).toBe('CLOSE_FRIENDS');
    expect(mocks.session).toHaveBeenCalledWith('viewer', 'refresh');
    expect(editor.onClose).toHaveBeenCalledOnce();
    expect(editor.client.getQueryData(['mobile', 'viewer', 'stories', 'feed'])).toBeDefined();
  });
}
it('rejects oversized photos before upload', async () => {
  mocks.picker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'photo.jpg', type: 'image', fileSize: 11 * 1024 * 1024 }],
  });
  const editor = await setup();
  await editor.click('Choose photo or video');
  await editor.click('Choose photo or video');
  expect(editor.element.querySelector('[role="alert"]')?.textContent).toContain('5 MB');
  expect(editor.button('Share story').disabled).toBe(true);
  expect(mocks.post).not.toHaveBeenCalled();
});
it('allows offline drafting while preventing publishing', async () => {
  const editor = await setup(false);
  expect(editor.button('Choose photo or video').disabled).toBe(false);
  expect(editor.button('Share story').disabled).toBe(true);
  expect(editor.element.textContent).toContain("You're offline");
  expect(mocks.picker).not.toHaveBeenCalled();
  expect(mocks.post).not.toHaveBeenCalled();
});
it('blocks duplicate publishing and closing while the upload is pending', async () => {
  mocks.picker.mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'photo.jpg',
        type: 'image',
        width: 900,
        height: 1600,
        file: new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' }),
      },
    ],
  });
  let resolveUpload: (value: { data: StoryViewResponse }) => void = () => {};
  mocks.post.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
  );
  const editor = await setup();
  await editor.click('Choose photo or video');
  await editor.click('Choose photo or video');
  await editor.click('Share story');
  expect(editor.button('Share story').disabled).toBe(true);
  expect(editor.button('Close').disabled).toBe(true);
  await editor.click('Share story');
  expect(mocks.post).toHaveBeenCalledOnce();
  await act(async () => {
    resolveUpload({ data: story });
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(editor.onClose).toHaveBeenCalledOnce();
});

async function fill(editor: Awaited<ReturnType<typeof setup>>, label: string, value: string) {
  const input = editor.element.querySelector<HTMLTextAreaElement>(`[aria-label="${label}"]`);
  if (!input) throw new Error(`Missing field ${label}`);
  await act(async () => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
it('publishes a background story with web typography and animation without requiring a file', async () => {
  mocks.post.mockResolvedValue({ data: story });
  const editor = await setup();
  await editor.click('Add text');
  await fill(editor, 'Story text', 'Привіт 🌙');
  await editor.click('Font: signature');
  await editor.click('Animation: bounce');
  await editor.click('Alignment: left');
  await editor.click('Save Text');
  await editor.click('Share story');
  const body = mocks.post.mock.calls[0]?.[1] as FormData;
  expect(body.has('file')).toBe(false);
  expect(body.get('backgroundColor')).toContain('linear-gradient');
  expect(JSON.parse(String(body.get('overlays')))[0]).toMatchObject({
    type: 'text',
    text: 'Привіт 🌙',
    fontFamily: 'signature',
    animation: 'bounce',
    textAlign: 'left',
  });
});
it('edits one poll in place and preserves the existing draft when close is cancelled', async () => {
  const editor = await setup();
  await editor.click('Choose emoji');
  await editor.click('Poll');
  await fill(editor, 'Poll question', 'Tea or coffee?');
  await editor.click('Save Poll');
  await editor.click('Expand extra tools');
  await editor.click('Poll');
  await fill(editor, 'Poll question', 'Choose a drink');
  await editor.click('Save Poll');
  await editor.click('Close');
  await editor.click('Keep editing');
  expect(editor.onClose).not.toHaveBeenCalled();
  mocks.post.mockResolvedValue({ data: story });
  await editor.click('Share story');
  const overlays = JSON.parse(String(mocks.post.mock.calls[0]?.[1].get('overlays')));
  expect(overlays.filter((layer: { type: string }) => layer.type === 'poll')).toHaveLength(1);
  expect(overlays[0].question).toBe('Choose a drink');
});
it('rejects unsafe link stickers and accepts a normalized https URL', async () => {
  mocks.post.mockResolvedValue({ data: story });
  const editor = await setup();
  await editor.click('Choose emoji');
  await editor.click('Link');
  await fill(editor, 'Link URL', 'javascript:alert(1)');
  await editor.click('Save Link');
  expect(editor.element.querySelector('[role="alert"]')?.textContent).toContain('http or https');
  await fill(editor, 'Link URL', 'example.com/story');
  await editor.click('Save Link');
  await editor.click('Share story');
  expect(JSON.parse(String(mocks.post.mock.calls[0]?.[1].get('overlays')))[0].url).toBe(
    'https://example.com/story',
  );
});
it('retains the draft and sends no request when the account changes during file preparation', async () => {
  mocks.picker.mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'photo.jpg',
        type: 'image',
        width: 100,
        height: 100,
        file: new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' }),
      },
    ],
  });
  mocks.session.mockImplementation(() => {
    throw new Error('Your session changed');
  });
  const editor = await setup();
  await editor.click('Choose photo or video');
  await editor.click('Choose photo or video');
  await editor.click('Share story');
  expect(mocks.post).not.toHaveBeenCalled();
  expect(editor.onClose).not.toHaveBeenCalled();
  expect(editor.element.querySelector('[role="alert"]')?.textContent).toContain('session changed');
});
