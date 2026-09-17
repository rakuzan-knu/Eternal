import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FolderRow from '../FolderRow';

describe('FolderRow', () => {
  it('renders title, action, and handles click', () => {
    const onClick = vi.fn();
    render(
      <FolderRow
        icon={<span data-testid="folder-icon">*</span>}
        title="Work"
        action="Edit"
        color="#3b82f6"
        onClick={onClick}
      />,
    );

    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByTestId('folder-icon')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
