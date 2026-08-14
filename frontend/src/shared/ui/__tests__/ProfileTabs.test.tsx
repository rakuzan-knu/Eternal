import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProfileTabs from '../ProfileTabs';

describe('ProfileTabs', () => {
  it('marks the "posts" tab as active when activeTab is "posts"', () => {
    render(<ProfileTabs activeTab="posts" setActiveTab={vi.fn()} />);

    expect(screen.getByRole('button', { name: /^posts$/i })).toHaveClass('text-white');
    expect(screen.getByRole('button', { name: /^reposts$/i })).toHaveClass('text-gray-500');
  });

  it('marks the "reposts" tab as active when activeTab is "reposts"', () => {
    render(<ProfileTabs activeTab="reposts" setActiveTab={vi.fn()} />);

    expect(screen.getByRole('button', { name: /^reposts$/i })).toHaveClass('text-white');
    expect(screen.getByRole('button', { name: /^posts$/i })).toHaveClass('text-gray-500');
  });

  it('calls setActiveTab("reposts") when the reposts tab is clicked', async () => {
    const setActiveTab = vi.fn();
    const user = userEvent.setup();
    render(<ProfileTabs activeTab="posts" setActiveTab={setActiveTab} />);

    await user.click(screen.getByRole('button', { name: /^reposts$/i }));

    expect(setActiveTab).toHaveBeenCalledTimes(1);
    expect(setActiveTab).toHaveBeenCalledWith('reposts');
  });

  it('calls setActiveTab("posts") when the posts tab is clicked', async () => {
    const setActiveTab = vi.fn();
    const user = userEvent.setup();
    render(<ProfileTabs activeTab="reposts" setActiveTab={setActiveTab} />);

    await user.click(screen.getByRole('button', { name: /^posts$/i }));

    expect(setActiveTab).toHaveBeenCalledWith('posts');
  });

  it('does not blow up when clicked rapidly twice in a row', async () => {
    const setActiveTab = vi.fn();
    const user = userEvent.setup();
    render(<ProfileTabs activeTab="posts" setActiveTab={setActiveTab} />);
    const repostsTab = screen.getByRole('button', { name: /^reposts$/i });

    await user.click(repostsTab);
    await user.click(repostsTab);

    expect(setActiveTab).toHaveBeenCalledTimes(2);
  });
});
