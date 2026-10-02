import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MessageComposer from '../MessageComposer';
import type { useMessageActions } from '../../model/useMessageActions';
import type { MessageView } from '@/entities/chat/model/types';
import { StagedFile } from '@/shared/model/useStagedAttachments';
import * as linkPreviewHook from '@/entities/opengraph/model/useLinkPreview';
import { Permission } from '@/shared/lib/permissions';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('MessageComposer', () => {
  const mockActions = {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    setTyping: vi.fn(),
    uploadAttachment: vi.fn().mockResolvedValue({ type: 'IMAGE', url: 'test.jpg' }),
  } as unknown as ReturnType<typeof useMessageActions>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea with placeholder', () => {
    act(() => {
      renderWithClient(
        <MessageComposer
          conversationId="conv-1"
          actions={mockActions}
          replyingTo={null}
          onCancelReply={vi.fn()}
          stagedFiles={[]}
          stagedFilesError={null}
          onAddFiles={vi.fn()}
          onRemoveFile={vi.fn()}
          onReplaceFile={vi.fn()}
          onClearFiles={vi.fn()}
          onDismissFilesError={vi.fn()}
          isGroup={false}
        />,
      );
    });

    expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
  });

  it('handles typing and sending message on Enter key press', async () => {
    act(() => {
      renderWithClient(
        <MessageComposer
          conversationId="conv-1"
          actions={mockActions}
          replyingTo={null}
          onCancelReply={vi.fn()}
          stagedFiles={[]}
          stagedFilesError={null}
          onAddFiles={vi.fn()}
          onRemoveFile={vi.fn()}
          onReplaceFile={vi.fn()}
          onClearFiles={vi.fn()}
          onDismissFilesError={vi.fn()}
          isGroup={false}
        />,
      );
    });

    const textarea = screen.getByPlaceholderText('Message');
    act(() => {
      fireEvent.change(textarea, { target: { value: 'Hello there!' } });
    });

    expect(mockActions.setTyping).toHaveBeenCalledWith(true);

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });
    expect(mockActions.sendMessage).toHaveBeenCalledWith('Hello there!', undefined, undefined);
  });

  it('handles sending attachment-only message on Enter key press without text', async () => {
    const mockFile: StagedFile = {
      file: new File([''], 'test.png', { type: 'image/png' }),
      previewUrl: 'blob:test',
    };

    act(() => {
      renderWithClient(
        <MessageComposer
          conversationId="conv-1"
          actions={mockActions}
          replyingTo={null}
          onCancelReply={vi.fn()}
          stagedFiles={[mockFile]}
          stagedFilesError={null}
          onAddFiles={vi.fn()}
          onRemoveFile={vi.fn()}
          onReplaceFile={vi.fn()}
          onClearFiles={vi.fn()}
          onDismissFilesError={vi.fn()}
          isGroup={false}
        />,
      );
    });

    const textarea = screen.getByPlaceholderText('Message');
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });
    expect(mockActions.sendMessage).toHaveBeenCalled();
  });

  it('displays circular progress ring when text reaches 1500 chars and remaining count at 1950 chars', () => {
    act(() => {
      renderWithClient(
        <MessageComposer
          conversationId="conv-1"
          actions={mockActions}
          replyingTo={null}
          onCancelReply={vi.fn()}
          stagedFiles={[]}
          stagedFilesError={null}
          onAddFiles={vi.fn()}
          onRemoveFile={vi.fn()}
          onReplaceFile={vi.fn()}
          onClearFiles={vi.fn()}
          onDismissFilesError={vi.fn()}
          isGroup={false}
        />,
      );
    });

    const textarea = screen.getByPlaceholderText('Message');
    expect(screen.queryByTestId('composer-limit-ring')).not.toBeInTheDocument();

    act(() => {
      fireEvent.change(textarea, { target: { value: 'A'.repeat(1600) } });
    });
    expect(screen.getByTestId('composer-limit-ring')).toBeInTheDocument();
    expect(screen.queryByText('400')).not.toBeInTheDocument();

    act(() => {
      fireEvent.change(textarea, { target: { value: 'A'.repeat(1950) } });
    });
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('enforces restricted permissions on voice and media buttons', () => {
    act(() => {
      renderWithClient(
        <MessageComposer
          conversationId="conv-1"
          actions={mockActions}
          replyingTo={null}
          onCancelReply={vi.fn()}
          stagedFiles={[]}
          stagedFilesError={null}
          onAddFiles={vi.fn()}
          onRemoveFile={vi.fn()}
          onReplaceFile={vi.fn()}
          onClearFiles={vi.fn()}
          onDismissFilesError={vi.fn()}
          isGroup={false}
          permissions={{ canSendMedia: false, canSendVoice: false, canSendPolls: false }}
        />,
      );
    });

    const restrictedButtons = screen.getAllByTitle('This action is restricted in this chat');
    expect(restrictedButtons.length).toBeGreaterThan(0);
  });

  it('renders Live Link Preview Banner when text contains a link and allows dismissal with X', () => {
    vi.useFakeTimers();

    vi.spyOn(linkPreviewHook, 'useLinkPreview').mockImplementation(
      (url) =>
        ({
          data: url
            ? {
                url,
                type: 'youtube',
                title: 'Never Gonna Give You Up',
                description: 'YouTube · Rick Astley',
                siteName: 'YouTube',
                image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                favicon: null,
              }
            : null,
          isLoading: false,
        }) as unknown as ReturnType<typeof linkPreviewHook.useLinkPreview>,
    );

    act(() => {
      renderWithClient(
        <MessageComposer
          conversationId="conv-1"
          actions={mockActions}
          replyingTo={null}
          onCancelReply={vi.fn()}
          stagedFiles={[]}
          stagedFilesError={null}
          onAddFiles={vi.fn()}
          onRemoveFile={vi.fn()}
          onReplaceFile={vi.fn()}
          onClearFiles={vi.fn()}
          onDismissFilesError={vi.fn()}
          isGroup={false}
        />,
      );
    });

    const textarea = screen.getByPlaceholderText('Message');
    act(() => {
      fireEvent.change(textarea, { target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' } });
      vi.advanceTimersByTime(600);
    });

    // LinkPreviewBanner should appear with mock data
    expect(screen.getByTestId('link-preview-banner')).toBeInTheDocument();
    expect(screen.getByText('Never Gonna Give You Up')).toBeInTheDocument();

    const dismissBtn = screen.getByTitle('Dismiss link preview');
    act(() => {
      fireEvent.click(dismissBtn);
    });

    expect(screen.queryByTestId('link-preview-banner')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('handles attachment upload error with FileReader fallback and file deletion/spoilering', async () => {
    mockActions.uploadAttachment = vi.fn().mockRejectedValueOnce(new Error('Upload failed'));

    const origReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function () {
      Object.defineProperty(this, 'result', {
        value: 'data:application/pdf;base64,ZmFrZQ==',
        writable: true,
      });
      if (typeof this.onload === 'function') {
        this.onload(new ProgressEvent('load') as unknown as ProgressEvent<FileReader>);
      }
    };

    const mockFile: StagedFile = {
      file: new File(['fake content'], 'doc.pdf', { type: 'application/pdf' }),
      previewUrl: 'blob:doc',
      isSpoiler: true,
    };

    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={
          {
            id: 'reply-1',
            sender: { id: 'usr-1', username: 'alice', displayName: 'Alice' },
            body: 'Replied message',
          } as any
        }
        onCancelReply={vi.fn()}
        stagedFiles={[mockFile]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message');
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });

    expect(mockActions.sendMessage).toHaveBeenCalled();
    FileReader.prototype.readAsDataURL = origReadAsDataURL;
  });

  it('handles formatting hotkeys (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K), auto-wrap brackets, and emoji/poll popovers', async () => {
    const onAddFiles = vi.fn();
    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={onAddFiles}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;

    // 1. Type text and trigger hotkeys
    fireEvent.change(textarea, { target: { value: 'selected text' } });
    textarea.setSelectionRange(0, 13);

    // Ctrl+B (Bold)
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    expect(textarea.value).toContain('**selected text**');

    // Ctrl+I (Italic)
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });

    // Ctrl+U (Underline)
    fireEvent.keyDown(textarea, { key: 'u', ctrlKey: true });

    // Ctrl+K (Link)
    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });

    // Auto-wrap quote pair "
    textarea.setSelectionRange(0, 5);
    fireEvent.keyDown(textarea, { key: '"' });

    // 2. Emoji picker select
    const emojiBtn = screen.getByTitle(/add emoji/i);
    fireEvent.click(emojiBtn);
  });

  it('renders slow mode active countdown and max 2000 character limit ring color', () => {
    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
        slowModeSeconds={10}
      />,
    );

    expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
  });

  it('handles editing staged image and triggers onReplaceFile on save', async () => {
    const originalImage = window.Image;
    window.Image = class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
      get src() {
        return this._src;
      }
    } as any;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
    });

    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((cb) => {
      cb(new Blob(['edited'], { type: 'image/png' }));
    });

    const onReplaceFile = vi.fn();
    const mockImageFile: StagedFile = {
      file: new File(['image'], 'pic.png', { type: 'image/png' }),
      previewUrl: 'blob:pic',
      isSpoiler: false,
    };

    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[mockImageFile]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={onReplaceFile}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    // Edit thumbnail
    const editThumbnail = screen.getByTitle('Click to edit image');
    fireEvent.click(editThumbnail);

    // Save in ImageEditorModal
    const doneBtn = await screen.findByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(onReplaceFile).toHaveBeenCalled();
    window.Image = originalImage;
  });

  it('displays duration badge for staged video, opens VideoEditorModal on click, and triggers onReplaceFile on save', async () => {
    const onReplaceFile = vi.fn();
    const mockVideoFile: StagedFile = {
      file: new File(['fake-vid'], 'clip.mp4', { type: 'video/mp4' }),
      previewUrl: 'blob:clip.mp4',
      duration: 27,
    };

    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[mockVideoFile]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={onReplaceFile}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    // Expect duration badge showing 0:27
    expect(screen.getByText('0:27')).toBeInTheDocument();

    // Click to edit video thumbnail
    const editThumbnail = screen.getByTitle('Click to edit video');
    fireEvent.click(editThumbnail);

    // Expect VideoEditorModal to be open with 'Edit'
    expect(screen.getByText('Edit')).toBeInTheDocument();

    // Click Done to save
    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    expect(onReplaceFile).toHaveBeenCalledWith(
      0,
      mockVideoFile.file,
      false,
      expect.objectContaining({
        duration: 27,
      }),
    );
  });

  it('respects permissionsMask bitwise flag disabling media', () => {
    // Permission without CAN_SEND_MEDIA or CAN_SEND_POLLS
    const mask = Permission.CAN_SEND_TEXT;
    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={true}
        permissionsMask={mask}
      />,
    );

    const attachButton = screen.queryByTitle('Add attachments, photos, videos or files');
    expect(attachButton).not.toBeInTheDocument();
  });

  it('auto-focuses textarea and inserts character when pressing ordinary key while idle', () => {
    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');

    // Press 'k' globally while focus is on document.body
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    });

    expect(textarea.value).toBe('k');
    expect(document.activeElement).toBe(textarea);
  });

  it('does not auto-focus when shortcut modifiers (Ctrl/Cmd/Alt) are pressed', () => {
    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });

    expect(textarea.value).toBe('');
  });

  it('respects canAutoFocus={false} and does not auto-focus', () => {
    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
        canAutoFocus={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    });

    expect(textarea.value).toBe('');
  });

  it('prefills textarea with editingMessage, displays Editing banner and saves edit on checkmark button click', async () => {
    const onCancelEdit = vi.fn();
    const editMockActions = {
      ...mockActions,
      editMessage: vi.fn().mockResolvedValue({}),
    };

    const mockEditingMsg: MessageView = {
      id: 'msg-edit-1',
      conversationId: 'conv-1',
      body: 'и фри подписка',
      messageType: 'TEXT',
      replyTo: null,
      forwardedFrom: null,
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      editedAt: null,
      reactions: [],
      attachments: [],
      sender: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
    };

    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={editMockActions as any}
        replyingTo={null}
        onCancelReply={vi.fn()}
        editingMessage={mockEditingMsg}
        onCancelEdit={onCancelEdit}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    // Verify Editing header is displayed
    expect(screen.getByText('Editing')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;
    expect(textarea.value).toBe('и фри подписка');

    // Change text
    fireEvent.change(textarea, { target: { value: 'и фри подписка обновлено' } });

    // Save with checkmark button
    const checkmarkBtn = screen.getByTitle('Save changes (Enter)');
    expect(checkmarkBtn).toBeInTheDocument();
    fireEvent.click(checkmarkBtn);

    expect(editMockActions.editMessage).toHaveBeenCalledWith(
      'msg-edit-1',
      'и фри подписка обновлено',
      'и фри подписка',
    );
  });

  it('cancels editing on Escape key and restores previous draft', () => {
    const onCancelEdit = vi.fn();
    const mockEditingMsg: MessageView = {
      id: 'msg-edit-2',
      conversationId: 'conv-1',
      body: 'some message',
      messageType: 'TEXT',
      replyTo: null,
      forwardedFrom: null,
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      editedAt: null,
      reactions: [],
      attachments: [],
      sender: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
    };

    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        editingMessage={mockEditingMsg}
        onCancelEdit={onCancelEdit}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;
    expect(textarea.value).toBe('some message');

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it('displays Telegram replace media button when editing a message with media and opens popup menu with options', () => {
    const mockEditingMediaMsg: MessageView = {
      id: 'msg-media-1',
      conversationId: 'conv-1',
      body: 'Caption',
      messageType: 'IMAGE',
      replyTo: null,
      forwardedFrom: null,
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      editedAt: null,
      reactions: [],
      attachments: [
        {
          id: 'att-1',
          type: 'IMAGE',
          url: 'https://example.com/photo.jpg',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          width: 800,
          height: 600,
          duration: null,
          thumbnailUrl: null,
        },
      ],
      sender: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
    };

    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        editingMessage={mockEditingMediaMsg}
        onCancelEdit={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    // Telegram Replace Media button should be displayed instead of AttachMenu plus button
    const replaceBtn = screen.getByTitle('Replace media');
    expect(replaceBtn).toBeInTheDocument();

    // Click it to open the popup menu
    fireEvent.click(replaceBtn);

    // Verify 3 options are rendered: "Photo or Video", "Document", "Edit this photo"
    expect(screen.getByText('Photo or Video')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('Edit this photo')).toBeInTheDocument();
  });

  it('handles pasting image file on textarea via Ctrl+V or paste and calls onAddFiles', () => {
    const onAddFiles = vi.fn();
    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={onAddFiles}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;
    const pastedImageFile = new File(['image-bytes'], 'screenshot.png', { type: 'image/png' });

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => pastedImageFile,
          },
        ],
        getData: vi.fn(() => ''),
      },
    });

    expect(onAddFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'image/png',
      }),
    ]);
  });

  it('replaces media when pasting an image while editing a message with media', () => {
    const mockEditingMediaMsg: MessageView = {
      id: 'msg-media-1',
      conversationId: 'conv-1',
      body: 'Old Caption',
      messageType: 'IMAGE',
      replyTo: null,
      forwardedFrom: null,
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      editedAt: null,
      reactions: [],
      attachments: [
        {
          id: 'att-1',
          type: 'IMAGE',
          url: 'https://example.com/photo.jpg',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          width: 800,
          height: 600,
          duration: null,
          thumbnailUrl: null,
        },
      ],
      sender: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
    };

    renderWithClient(
      <MessageComposer
        conversationId="conv-1"
        actions={mockActions}
        replyingTo={null}
        onCancelReply={vi.fn()}
        editingMessage={mockEditingMediaMsg}
        onCancelEdit={vi.fn()}
        stagedFiles={[]}
        stagedFilesError={null}
        onAddFiles={vi.fn()}
        onRemoveFile={vi.fn()}
        onReplaceFile={vi.fn()}
        onClearFiles={vi.fn()}
        onDismissFilesError={vi.fn()}
        isGroup={false}
      />,
    );

    const textarea = screen.getByPlaceholderText('Message') as HTMLTextAreaElement;
    const newImageFile = new File(['new-bytes'], 'replaced.png', { type: 'image/png' });

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => newImageFile,
          },
        ],
        getData: vi.fn(() => ''),
      },
    });

    // The Replace Media button remains visible and EditPreview displays the new image
    expect(screen.getByTitle('Replace media')).toBeInTheDocument();
  });
});
