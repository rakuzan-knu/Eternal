import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImagePickerAsset } from 'expo-image-picker';

const platform = vi.hoisted(() => ({ OS: 'web' }));
const manipulator = vi.hoisted(() => ({
  create: vi.fn(),
  render: vi.fn(),
  save: vi.fn(),
  imageRelease: vi.fn(),
  contextRelease: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: manipulator.create },
  SaveFormat: { JPEG: 'jpeg' },
}));
import { postForm, storyForm, reelForm } from './postForm';

const photo: ImagePickerAsset = {
  uri: 'file:///photo.jpg',
  width: 300,
  height: 200,
  type: 'image',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
};

afterEach(() => {
  vi.unstubAllGlobals();
  platform.OS = 'web';
  vi.clearAllMocks();
});

it('converts native HEIC story media and stickers to JPEG and releases decoded images', async () => {
  platform.OS = 'ios';
  manipulator.create.mockReturnValue({
    renderAsync: manipulator.render,
    release: manipulator.contextRelease,
  });
  manipulator.render.mockResolvedValue({
    saveAsync: manipulator.save,
    release: manipulator.imageRelease,
  });
  manipulator.save.mockResolvedValue({ uri: 'file:///converted.jpg', width: 300, height: 200 });
  class NativeFormData {
    fields = new Map<string, unknown>();
    append(name: string, value: unknown) {
      this.fields.set(name, value);
    }
    get(name: string) {
      return this.fields.get(name);
    }
  }
  vi.stubGlobal('FormData', NativeFormData);
  const heic = {
    ...photo,
    uri: 'file:///photo.HEIC',
    fileName: 'photo.HEIC',
    mimeType: 'image/heic',
  };
  const body = await storyForm(
    heic,
    'photo',
    'ALL_FOLLOWERS',
    { overlays: [{ id: 'sticker', type: 'image', xPercent: 50, yPercent: 50 }] },
    { sticker: heic },
  );
  for (const field of ['file', 'overlay:sticker'])
    expect(body.get(field)).toEqual({
      uri: 'file:///converted.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
  expect(manipulator.create).toHaveBeenCalledWith(heic.uri);
  expect(manipulator.save).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.85 });
  expect(manipulator.imageRelease).toHaveBeenCalledTimes(2);
  expect(manipulator.contextRelease).toHaveBeenCalledTimes(2);
});

it('retains the original upload error and releases its context when native decoding fails', async () => {
  platform.OS = 'ios';
  manipulator.create.mockReturnValue({
    renderAsync: manipulator.render,
    release: manipulator.contextRelease,
  });
  manipulator.render.mockRejectedValue(new Error('Cannot decode photo'));
  await expect(postForm('', [{ ...photo, mimeType: 'image/heic' }], [])).rejects.toThrow(
    'Cannot decode photo',
  );
  expect(manipulator.contextRelease).toHaveBeenCalledOnce();
  expect(manipulator.save).not.toHaveBeenCalled();
});

it('uploads reels using video and converts picker milliseconds to server seconds', async () => {
  const body = await reelForm(
    {
      ...photo,
      type: 'video',
      mimeType: 'video/mp4',
      file: new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
      duration: 5500,
    },
    { caption: ' A reel ', audioTitle: ' Original ', audioArtist: ' Alex ' },
  );
  expect(body.get('caption')).toBe('A reel');
  expect(body.get('audioTitle')).toBe('Original');
  expect(body.get('audioArtist')).toBe('Alex');
  expect(body.get('duration')).toBe('5.5');
  expect(body.get('video')).toBeInstanceOf(File);
  expect(body.has('file')).toBe(false);
  expect(body.has('media')).toBe(false);
});

it('rejects image reels and invalid captions before uploading', async () => {
  await expect(reelForm(photo, { caption: 'Photo' })).rejects.toThrow('Choose a video');
  await expect(
    reelForm({ ...photo, type: 'video' }, { caption: 'x'.repeat(2001) }),
  ).rejects.toThrow();
});

it('uses the native video descriptor and omits unavailable dimensions and duration', async () => {
  platform.OS = 'ios';
  class NativeFormData {
    fields = new Map<string, unknown>();
    append(name: string, value: unknown) {
      this.fields.set(name, value);
    }
    get(name: string) {
      return this.fields.get(name);
    }
    has(name: string) {
      return this.fields.has(name);
    }
  }
  vi.stubGlobal('FormData', NativeFormData);
  const body = await reelForm(
    {
      uri: 'file:///clip.mov',
      type: 'video',
      fileName: 'clip.mov',
      mimeType: 'video/quicktime',
      width: 0,
      height: 0,
    },
    { caption: 'native' },
  );
  expect(body.get('video')).toEqual({
    uri: 'file:///clip.mov',
    name: 'clip.mov',
    type: 'video/quicktime',
  });
  expect(body.has('duration')).toBe(false);
  expect(body.has('width')).toBe(false);
});

describe('post and story upload contracts', () => {
  it('trims text and sends poll choices as JSON', async () => {
    const body = await postForm(' hello ', [], [' one ', 'two']);
    expect(body.get('content')).toBe('hello');
    expect(body.get('poll')).toBe('["one","two"]');
    expect(body.has('media')).toBe(false);
  });
  it('uploads web blobs with the original filename', async () => {
    const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });
    const body = await postForm('', [{ ...photo, file }], []);
    const attached = body.get('media');
    expect(attached).toBeInstanceOf(File);
    if (!(attached instanceof File)) throw new Error('Missing file');
    expect(attached.name).toBe('photo.jpg');
    expect(await attached.text()).toBe('pixels');
  });
  it('bounds and reencodes native images before constructing their file descriptors', async () => {
    platform.OS = 'android';
    const resize = vi.fn();
    manipulator.create.mockReturnValue({
      resize,
      renderAsync: manipulator.render,
      release: manipulator.contextRelease,
    });
    manipulator.render.mockResolvedValue({
      saveAsync: manipulator.save,
      release: manipulator.imageRelease,
    });
    manipulator.save.mockResolvedValue({ uri: 'file:///prepared.jpg', width: 2048, height: 1024 });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    class NativeFormData {
      fields = new Map<string, unknown>();
      append(name: string, value: unknown) {
        this.fields.set(name, value);
      }
      get(name: string) {
        return this.fields.get(name);
      }
    }
    vi.stubGlobal('FormData', NativeFormData);
    const body = await postForm('hello', [{ ...photo, width: 4096, height: 2048 }], []);
    expect(body.get('media')).toEqual({
      uri: 'file:///prepared.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
    expect(resize).toHaveBeenCalledWith({ width: 2048, height: 1024 });
    expect(manipulator.save).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.85 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('uses the distinct story file field, media type and privacy', async () => {
    const body = await storyForm(
      { ...photo, file: new File(['pixels'], 'photo.jpg') },
      ' caption ',
    );
    expect(body.get('caption')).toBe('caption');
    expect(body.get('mediaType')).toBe('IMAGE');
    expect(body.get('privacy')).toBe('ALL_FOLLOWERS');
    expect(body.has('file')).toBe(true);
    expect(body.has('media')).toBe(false);
  });
  it('validates story size and caption before multipart upload and sends chosen privacy', async () => {
    await expect(storyForm({ ...photo, fileSize: 11 * 1024 * 1024 }, 'caption')).rejects.toThrow(
      '5 MB',
    );
    await expect(storyForm(photo, 'x'.repeat(1001))).rejects.toThrow();
    const body = await storyForm(
      { ...photo, type: undefined, mimeType: 'video/mp4', file: new File(['video'], 'clip.mp4') },
      'hello',
      'CLOSE_FRIENDS',
    );
    expect(body.get('privacy')).toBe('CLOSE_FRIENDS');
    expect(body.get('mediaType')).toBe('VIDEO');
    expect(body.has('file')).toBe(true);
  });
});

it('uploads photo stickers separately and strips temporary preview URLs from their layers', async () => {
  const body = await storyForm(
    null,
    '',
    'CLOSE_FRIENDS',
    {
      backgroundColor: 'linear-gradient(180deg, #181824 0%, #09090b 100%)',
      filter: 'tokyo',
      overlays: [
        {
          id: 'photo',
          type: 'image',
          url: 'blob:sticker',
          isMainMedia: false,
          xPercent: 40,
          yPercent: 60,
        },
      ],
    },
    { photo: { ...photo, file: new File(['sticker'], 'sticker.jpg', { type: 'image/jpeg' }) } },
  );
  expect(body.has('file')).toBe(false);
  expect(body.get('overlay:photo')).toBeInstanceOf(File);
  expect(body.get('filter')).toBe('tokyo');
  expect(JSON.parse(String(body.get('overlays')))[0]).not.toHaveProperty('url');
});
it('preserves music style, clip and stable track id in multipart JSON', async () => {
  const body = await storyForm(null, '', 'ALL_FOLLOWERS', {
    backgroundColor: '#181824',
    overlays: [
      {
        id: 'music',
        type: 'audio',
        soundCloudTrackId: '1234',
        musicStyle: 'vinyl',
        stickerColor: '#00ffcc',
        startTimeMs: 20000,
        clipDurationSeconds: 10,
        musicVolume: 0.5,
        videoVolume: 0.25,
        xPercent: 50,
        yPercent: 75,
      },
    ],
  });
  expect(JSON.parse(String(body.get('overlays')))[0]).toMatchObject({
    soundCloudTrackId: '1234',
    startTimeMs: 20000,
    clipDurationSeconds: 10,
    musicVolume: 0.5,
    videoVolume: 0.25,
  });
});
