import { describe, it, expect } from 'vitest';
import { getMessageToastPreview } from '../getMessageToastPreview';
import type { MessageView, AttachmentView } from '@/entities/chat/model/types';

describe('getMessageToastPreview', () => {
  it('returns deleted message string when isDeleted is true', () => {
    const msg: Partial<MessageView> = { isDeleted: true, body: 'Deleted text', attachments: [] };
    expect(getMessageToastPreview(msg as MessageView)).toBe('This message was deleted');
  });

  it('returns trimmed body when present', () => {
    const msg: Partial<MessageView> = {
      isDeleted: false,
      body: '  Hello world!  ',
      attachments: [],
    };
    expect(getMessageToastPreview(msg as MessageView)).toBe('Hello world!');
  });

  it('never leaks E2EE envelope JSON into notifications', () => {
    const envelope = JSON.stringify({ e2ee: true, v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'd29ybGQ' });
    expect(
      getMessageToastPreview({
        isDeleted: false,
        body: envelope,
        attachments: [],
      } as unknown as MessageView),
    ).toBe('New encrypted message');
    // Plaintext that merely mentions the marker still shows (M3 parity).
    expect(
      getMessageToastPreview({
        isDeleted: false,
        body: 'note: {"e2ee":true} is the marker',
        attachments: [],
      } as unknown as MessageView),
    ).toBe('note: {"e2ee":true} is the marker');
  });

  it('returns appropriate string when message has no attachments and empty body', () => {
    expect(
      getMessageToastPreview({
        isDeleted: false,
        body: '',
        messageType: 'AUDIO',
        attachments: [],
      } as unknown as MessageView),
    ).toBe('Sent a voice message');

    expect(
      getMessageToastPreview({
        isDeleted: false,
        body: '',
        messageType: 'VIDEO',
        attachments: [],
      } as unknown as MessageView),
    ).toBe('Sent a video message');

    expect(
      getMessageToastPreview({
        isDeleted: false,
        body: '',
        messageType: 'TEXT',
        attachments: [],
      } as unknown as MessageView),
    ).toBe('New message');
  });

  it('returns attachment type description when body is empty', () => {
    const isVideoNoteMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [
        {
          id: 'a0',
          url: '',
          type: 'VIDEO',
          fileName: 'video_note.mp4',
        } as unknown as AttachmentView,
      ],
    };
    expect(getMessageToastPreview(isVideoNoteMsg as MessageView)).toBe('Sent a video message');

    const audioMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a1', url: '', type: 'AUDIO' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(audioMsg as MessageView)).toBe('Sent a voice message');

    const imageMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a2', url: '', type: 'IMAGE' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(imageMsg as MessageView)).toBe('Sent a photo');

    const videoMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a3', url: '', type: 'VIDEO' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(videoMsg as MessageView)).toBe('Sent a video');

    const gifMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a4', url: '', type: 'GIF' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(gifMsg as MessageView)).toBe('Sent a GIF');

    const linkMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a5', url: '', type: 'LINK' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(linkMsg as MessageView)).toBe('Sent a link');

    const fileMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [
        { id: 'a6', url: '', type: 'FILE', fileName: 'contract.pdf' } as unknown as AttachmentView,
      ],
    };
    expect(getMessageToastPreview(fileMsg as MessageView)).toBe('Sent a file: contract.pdf');

    const unnamedFileMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a6b', url: '', type: 'FILE' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(unnamedFileMsg as MessageView)).toBe('Sent a file: file');

    const mimeVideoNoteMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [
        {
          id: 'a6c',
          url: '',
          type: 'VIDEO',
          mimeType: 'video_note/mp4',
        } as unknown as AttachmentView,
      ],
    };
    expect(getMessageToastPreview(mimeVideoNoteMsg as MessageView)).toBe('Sent a video message');

    const squareVideoNoteMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [
        {
          id: 'a6d',
          url: '',
          type: 'VIDEO',
          width: 320,
          height: 320,
        } as unknown as AttachmentView,
      ],
    };
    expect(getMessageToastPreview(squareVideoNoteMsg as MessageView)).toBe('Sent a video message');

    const unknownMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a7', url: '', type: 'CUSTOM' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(unknownMsg as MessageView)).toBe('Sent an attachment');
  });
});
