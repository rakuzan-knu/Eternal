import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageComposer from '../MessageComposer';

import type { useMessageActions } from '../../model/useMessageActions';

describe('MessageComposer', () => {
  const mockActions = {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    setTyping: vi.fn(),
  } as unknown as ReturnType<typeof useMessageActions>;

  it('renders textarea with placeholder', () => {
    render(
      <MessageComposer
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

    expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
  });

  it('handles typing and sending message on Enter key press', async () => {
    render(
      <MessageComposer
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

    const textarea = screen.getByPlaceholderText('Message');
    fireEvent.change(textarea, { target: { value: 'Hello there!' } });

    expect(mockActions.setTyping).toHaveBeenCalledWith(true);

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockActions.sendMessage).toHaveBeenCalledWith('Hello there!', undefined, undefined);
  });
});
