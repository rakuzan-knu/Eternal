import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImagePickerAsset } from 'expo-image-picker';

const platform = vi.hoisted(() => ({ OS: 'web' }));
vi.mock('react-native', () => ({ Platform: platform }));
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
  it('uses native file descriptors without fetching a device file URI', async () => {
    platform.OS = 'android';
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
    const body = await postForm('hello', [photo], []);
    expect(body.get('media')).toEqual({ uri: photo.uri, name: 'photo.jpg', type: 'image/jpeg' });
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
});
