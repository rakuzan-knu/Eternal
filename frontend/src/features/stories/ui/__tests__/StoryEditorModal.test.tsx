import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StoryEditorModal } from '../StoryEditorModal';
import { useStoryEditorStore } from '../../model/useStoryEditorStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StoryEditorModal', () => {
  beforeEach(() => {
    useStoryEditorStore.getState().reset();
  });

  it('does not render when modal is closed', () => {
    const { container } = render(<StoryEditorModal />, { wrapper: createWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when opened', () => {
    useStoryEditorStore.getState().openEditor();
    render(<StoryEditorModal />, { wrapper: createWrapper() });

    expect(screen.getByText('Ваша история')).toBeDefined();
    expect(screen.getByText('Близкие друзья')).toBeDefined();
  });

  it('opens text overlay tool and allows entering text', () => {
    useStoryEditorStore.getState().openEditor();
    render(<StoryEditorModal />, { wrapper: createWrapper() });

    const textToolBtn = screen.getByTitle('Добавить текст');
    fireEvent.click(textToolBtn);

    const textarea = screen.getByPlaceholderText(/Введите текст/);
    fireEvent.change(textarea, { target: { value: 'Cool Story' } });

    const doneBtn = screen.getByText('Готово');
    fireEvent.click(doneBtn);

    expect(useStoryEditorStore.getState().overlays.length).toBe(1);
    expect(useStoryEditorStore.getState().overlays[0].type).toBe('text');
  });
});
