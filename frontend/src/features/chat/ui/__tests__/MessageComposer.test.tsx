import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MessageComposer from '../MessageComposer';
import type { useMessageActions } from '../../model/useMessageActions';
import { StagedFile } from '@/shared/model/useStagedAttachments';
import * as linkPreviewHook from '@/entities/opengraph/model/useLinkPreview';

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
});
