import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportPostModal } from '../ReportPostModal';
import { postsApi } from '../../api/postsApi';

vi.mock('../../api/postsApi', () => ({
  postsApi: {
    report: vi.fn().mockResolvedValue({}),
  },
}));

describe('ReportPostModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <ReportPostModal postId="post-123" isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders complaint reasons and submits report on select', async () => {
    const onClose = vi.fn();

    render(<ReportPostModal postId="post-123" isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Complaint')).toBeInTheDocument();
    expect(screen.getByText('Why are you complaining about this post?')).toBeInTheDocument();
    expect(screen.getByText('I just don’t like it.')).toBeInTheDocument();
    expect(screen.getByText('Harassment or unwanted contact')).toBeInTheDocument();
    expect(screen.getByText('False information')).toBeInTheDocument();

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click
    const backdrop = screen.getByText('Complaint').closest('.fixed')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText('Harassment or unwanted contact'));
    expect(postsApi.report).toHaveBeenCalledWith('post-123', 'Harassment or unwanted contact');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(3);
    });
  });

  it('handles report API rejection gracefully', async () => {
    vi.mocked(postsApi.report).mockRejectedValueOnce(new Error('Network failure'));
    const onClose = vi.fn();

    render(<ReportPostModal postId="post-123" isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText('False information'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
