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
  it('renders complaint reasons and submits report on select', async () => {
    const onClose = vi.fn();

    render(<ReportPostModal postId="post-123" isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Complaint')).toBeInTheDocument();
    expect(screen.getByText('Why are you complaining about this post?')).toBeInTheDocument();
    expect(screen.getByText('I just don’t like it.')).toBeInTheDocument();
    expect(screen.getByText('Harassment or unwanted contact')).toBeInTheDocument();
    expect(screen.getByText('False information')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Harassment or unwanted contact'));
    expect(postsApi.report).toHaveBeenCalledWith('post-123', 'Harassment or unwanted contact');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
