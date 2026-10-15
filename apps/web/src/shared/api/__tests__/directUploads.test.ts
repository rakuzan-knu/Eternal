import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareDirectUploadForm } from '@shared/api-client';

const start = {
  mode: 'direct',
  uploadId: 'upload-one',
  url: 'https://bucket.example.test/object?signature=opaque',
  headers: { 'Content-Type': 'image/gif', 'Content-Length': '3', 'If-None-Match': '*' },
};
const proof = {
  uploadId: 'upload-one',
  url: 'https://media.example.test/object',
  contentType: 'image/gif',
  sizeBytes: 3,
  kind: 'IMAGE',
};

function form(field = 'file', type = 'image/gif') {
  const body = new FormData();
  body.append(field, new File(['gif'], 'photo.gif', { type }));
  return body;
}

function setup() {
  const api = axios.create({ headers: { Authorization: 'Bearer application-token' } });
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValueOnce({ data: start })
    .mockResolvedValueOnce({ data: proof });
  const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} });
  const storage = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal('fetch', storage);
  return { api, post, remove, storage };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('direct upload network contract', () => {
  it('sends media bytes only to storage without application credentials, then uses verified proof', async () => {
    const { api, post, storage } = setup();
    const input = form();
    input.append('caption', 'Keep my text');
    const signal = new AbortController().signal;
    const output = await prepareDirectUploadForm(api, input, 'story', { signal });
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/uploads/direct',
      {
        purpose: 'story',
        contentType: 'image/gif',
        sizeBytes: 3,
        filename: 'photo.gif',
      },
      { signal },
    );
    expect(storage).toHaveBeenCalledWith(start.url, {
      method: 'PUT',
      body: input.get('file'),
      credentials: 'omit',
      redirect: 'error',
      signal,
      headers: { 'Content-Type': 'image/gif', 'If-None-Match': '*' },
    });
    expect(post).toHaveBeenNthCalledWith(2, '/uploads/direct/upload-one/complete', {}, { signal });
    expect(output.get('file')).toBeNull();
    expect(output.get('uploadId')).toBe('upload-one');
    expect(output.get('caption')).toBe('Keep my text');
  });

  it('retains post text, valid existing media, and GIF entries alongside newly verified media', async () => {
    const { api } = setup();
    const input = new FormData();
    input.append('content', 'A caption');
    input.append(
      'media',
      JSON.stringify([{ type: 'VIDEO', url: 'https://media.example.test/existing', order: 0 }]),
    );
    input.append('media', new File(['gif'], 'photo.gif', { type: 'image/gif' }));
    input.append('gifUrls', 'https://gif.example.test/image.gif');
    const output = await prepareDirectUploadForm(api, input, 'post');
    expect(output.get('content')).toBe('A caption');
    expect(output.get('gifUrls')).toBe('https://gif.example.test/image.gif');
    expect(output.getAll('media')).toEqual([
      JSON.stringify([
        { type: 'VIDEO', url: 'https://media.example.test/existing', order: 0 },
        { type: 'IMAGE', url: proof.url, order: 1 },
      ]),
    ]);
  });

  it('uses scoped story-overlay admissions and sends only their proof map', async () => {
    const { api, post } = setup();
    const input = form('overlay:sticker-one');
    input.append('backgroundColor', '#112233');
    const output = await prepareDirectUploadForm(api, input, 'story');
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/uploads/direct',
      expect.objectContaining({ purpose: 'story-overlay' }),
      {},
    );
    expect(output.get('overlay:sticker-one')).toBeNull();
    expect(output.get('overlayUploads')).toBe(JSON.stringify({ 'sticker-one': 'upload-one' }));
    expect(output.get('backgroundColor')).toBe('#112233');
  });

  it('propagates a quota failure without sending bytes through the application API', async () => {
    const { api, post, storage } = setup();
    const quotaError = new Error('Allowance exhausted');
    post.mockReset().mockRejectedValueOnce(quotaError);
    await expect(prepareDirectUploadForm(api, form(), 'comment')).rejects.toBe(quotaError);
    expect(post).toHaveBeenCalledTimes(1);
    expect(storage).not.toHaveBeenCalled();
  });

  it('uses proxy mode only when the server explicitly selects local storage', async () => {
    const { api, post, storage } = setup();
    post.mockReset().mockResolvedValueOnce({ data: { mode: 'proxy' } });
    const input = form();
    expect(await prepareDirectUploadForm(api, input, 'avatar')).toBe(input);
    expect(storage).not.toHaveBeenCalled();
  });

  it('cleans up an unfinished reservation when a storage PUT fails', async () => {
    const { api, storage, post, remove } = setup();
    storage.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(prepareDirectUploadForm(api, form(), 'banner')).rejects.toThrow(
      'Storage upload failed (403)',
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('/uploads/direct/upload-one', { timeout: 5_000 });
  });

  it('does not reuse an aborted signal for cleanup after completion fails', async () => {
    const { api, post, remove, storage } = setup();
    const controller = new AbortController();
    const failure = new Error('Upload cancelled');
    post.mockReset().mockResolvedValueOnce({ data: start }).mockRejectedValueOnce(failure);
    storage.mockImplementationOnce(() => {
      controller.abort();
      return Promise.resolve({ ok: true, status: 200 });
    });
    await expect(
      prepareDirectUploadForm(api, form(), 'avatar', { signal: controller.signal }),
    ).rejects.toBe(failure);
    expect(remove).toHaveBeenCalledWith('/uploads/direct/upload-one', { timeout: 5_000 });
  });

  it('requires chat authorization context and refuses oversized input before admission', async () => {
    const { api, post, storage } = setup();
    await expect(prepareDirectUploadForm(api, form(), 'chat')).rejects.toThrow(
      'Conversation is required',
    );
    const large = new FormData();
    large.append(
      'file',
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.gif', { type: 'image/gif' }),
    );
    await expect(prepareDirectUploadForm(api, large, 'comment')).rejects.toThrow('5 MiB');
    expect(post).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it('stores generic chat files as non-executable octet-stream attachments', async () => {
    const { api, post } = setup();
    await prepareDirectUploadForm(api, form('file', 'application/pdf'), 'chat', {
      conversationId: 'chat',
    });
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/uploads/direct',
      expect.objectContaining({ contentType: 'application/octet-stream', conversationId: 'chat' }),
      expect.anything(),
    );
  });

  it('retains a text-only form without requesting a storage reservation', async () => {
    const { api, post } = setup();
    const input = new FormData();
    input.append('content', 'Text only');
    expect(await prepareDirectUploadForm(api, input, 'post')).toBe(input);
    expect(post).not.toHaveBeenCalled();
  });

  it('stops an already cancelled upload before admission', async () => {
    const { api, post } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(
      prepareDirectUploadForm(api, form(), 'avatar', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(post).not.toHaveBeenCalled();
  });
});
