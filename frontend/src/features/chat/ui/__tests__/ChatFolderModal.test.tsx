import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatFolderModal from '../ChatFolderModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ChatFolderModal', () => {
  const queryClient = new QueryClient();

  it('renders new folder modal with name label and create button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChatFolderModal conversations={[]} currentUserId="me" onClose={vi.fn()} onSave={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('New folder')).toBeInTheDocument();
    expect(screen.getByText('Folder name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument();
  });
});
