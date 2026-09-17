import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PostMenu } from '../PostMenu';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';

describe('PostMenu', () => {
  it('opens popup menu on trigger click and triggers callbacks for non-owner with Report at bottom', () => {
    const onSave = vi.fn();
    const onReport = vi.fn();
    const onBlockAuthor = vi.fn();

    render(
      <PostMenu
        postId="post-100"
        isOwner={false}
        onSave={onSave}
        onReport={onReport}
        onBlockAuthor={onBlockAuthor}
      />,
    );

    const trigger = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Save post')).toBeInTheDocument();
    expect(screen.getByText('Hide post')).toBeInTheDocument();
    expect(screen.getByText('Block author')).toBeInTheDocument();
    expect(screen.getByText('Copy link')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    // The last item in the dropdown should be Report
    expect(buttons[buttons.length - 1]).toHaveTextContent('Report');

    fireEvent.click(screen.getByText('Save post'));
    expect(onSave).toHaveBeenCalled();
  });

  it('renders owner-specific menu items for owner with Delete your post at bottom and handles copy link & pin', async () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onTogglePin = vi.fn();
    const onToggleHideLikes = vi.fn();
    const onToggleDisableComments = vi.fn();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <PostMenu
        postId="post-100"
        isOwner={true}
        isPinned={true}
        onDelete={onDelete}
        onEdit={onEdit}
        onTogglePin={onTogglePin}
        onToggleHideLikes={onToggleHideLikes}
        onToggleDisableComments={onToggleDisableComments}
      />,
    );

    const trigger = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Unpin from profile')).toBeInTheDocument();
    expect(screen.getByText('Edit post')).toBeInTheDocument();
    expect(screen.getByText('Hide like count')).toBeInTheDocument();
    expect(screen.getByText('Disable commenting')).toBeInTheDocument();

    // Toggle Pin
    fireEvent.click(screen.getByText('Unpin from profile'));
    expect(onTogglePin).toHaveBeenCalled();

    // Reopen and copy link
    fireEvent.click(trigger);
    await act(async () => {
      fireEvent.click(screen.getByText('Copy link'));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('hides post when clicking Hide post on non-owner post and handles Escape key and outside click', () => {
    render(<PostMenu postId="post-200" isOwner={false} />);

    const trigger = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(trigger);
    expect(screen.getByText('Hide post')).toBeInTheDocument();

    // Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Hide post')).not.toBeInTheDocument();

    // Outside click
    fireEvent.click(trigger);
    expect(screen.getByText('Hide post')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Hide post')).not.toBeInTheDocument();

    // Hide post action
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('Hide post'));
    expect(useHiddenPostsStore.getState().hiddenIds.has('post-200')).toBe(true);
  });
});
