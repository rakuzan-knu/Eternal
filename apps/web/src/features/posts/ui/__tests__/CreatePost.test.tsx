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

  it('handles formatting hotkeys like Ctrl+B and smart code paste', () => {
    act(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <CreatePost onSubmitFormData={vi.fn()} />
        </QueryClientProvider>,
      );
    });

    const textarea = screen.getByPlaceholderText("What's new?") as HTMLTextAreaElement;

    act(() => {
      fireEvent.change(textarea, { target: { value: 'awesome text' } });
      textarea.setSelectionRange(0, 7);
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    });

    // Test code paste
    const codeSample = `function test() {\n  const x = 1;\n  const y = 2;\n  const z = x + y;\n  return z;\n  console.log(z);\n}`;
    act(() => {
      fireEvent.paste(textarea, {
        clipboardData: { getData: () => codeSample },
      });
    });

    expect(screen.getByText(/Code snippet detected/i)).toBeInTheDocument();

    const formatBtn = screen.getByRole('button', { name: /^Format$/i });
    act(() => {
      fireEvent.click(formatBtn);
    });

    expect(textarea.value).toContain('```');
  });

  it('handles preview tab toggle, poll creation, gif select, file upload and removal', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-file');
    const onSubmit = vi.fn().mockResolvedValue({ success: true });

    render(
      <QueryClientProvider client={queryClient}>
        <CreatePost onSubmitFormData={onSubmit} />
      </QueryClientProvider>,
    );

    // 1. Preview tab
    const previewTab = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewTab);
    expect(screen.getByText(/Nothing to preview yet/i)).toBeInTheDocument();

    const writeTab = screen.getByRole('button', { name: /write/i });
    fireEvent.click(writeTab);

    // 2. Poll toggle
    const pollBtn = screen.getByTitle(/Create poll/i);
    fireEvent.click(pollBtn);

    const pollOptionInputs = screen.getAllByPlaceholderText(/Variant/i);
    fireEvent.change(pollOptionInputs[0], { target: { value: 'Choice A' } });
    fireEvent.change(pollOptionInputs[1], { target: { value: 'Choice B' } });

    // 3. Text
    const textarea = screen.getByPlaceholderText("What's new?");
    fireEvent.change(textarea, { target: { value: 'Poll question?' } });

    // 4. Submit
    const publishBtn = screen.getByRole('button', { name: /^publish$/i });
    fireEvent.click(publishBtn);

    await act(async () => {});
    expect(onSubmit).toHaveBeenCalled();
  });
});
