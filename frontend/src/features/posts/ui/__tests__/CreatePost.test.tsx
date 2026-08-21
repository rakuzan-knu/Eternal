import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CreatePost from '../CreatePost';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('CreatePost', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders composer textarea and publish button disabled when empty', () => {
    const onSubmit = vi.fn();
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <CreatePost onSubmitFormData={onSubmit} />
        </QueryClientProvider>,
      );
    });

    const textarea = screen.getByPlaceholderText("What's new?");
    expect(textarea).toBeInTheDocument();

    const publishBtn = screen.getByRole('button', { name: /^publish$/i });
    expect(publishBtn).toBeDisabled();
  });

  it('enables publish button when text is entered and submits formData', () => {
    const onSubmit = vi.fn();
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <CreatePost onSubmitFormData={onSubmit} />
        </QueryClientProvider>,
      );
    });

    const textarea = screen.getByPlaceholderText("What's new?");
    act(() => {
      fireEvent.change(textarea, { target: { value: 'Hello world!' } });
    });

    const publishBtn = screen.getByRole('button', { name: /^publish$/i });
    expect(publishBtn).toBeEnabled();

    act(() => {
      fireEvent.click(publishBtn);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
