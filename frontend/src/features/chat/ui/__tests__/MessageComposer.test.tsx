import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MessageComposer from '../MessageComposer';
import type { useMessageActions } from '../../model/useMessageActions';
import { StagedFile } from '@/shared/model/useStagedAttachments';

describe('MessageComposer', () => {
  const mockActions = {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    setTyping: vi.fn(),
    uploadAttachment: vi.fn().mockResolvedValue({ type: 'IMAGE', url: 'test.jpg' }),
  } as unknown as ReturnType<typeof useMessageActions>;

  it('renders textarea with placeholder', () => {
    act(() => {
      render(
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
      render(
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

    act(() => {
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
      render(
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
    act(() => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });
    expect(mockActions.sendMessage).toHaveBeenCalled();
  });

  it('displays circular progress ring when text reaches 1500 chars and remaining count at 1950 chars', () => {
    act(() => {
      render(
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
      render(
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
});
