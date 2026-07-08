import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddFileButton } from '../AddFileButton';

class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;

  readAsDataURL() {
    this.result = 'data:image/png;base64,mock';
    this.onloadend?.();
  }
}

describe('AddFileButton', () => {
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    originalFileReader = global.FileReader;
    // @ts-expect-error - simplified mock, not a full FileReader implementation
    global.FileReader = MockFileReader;
  });

  afterEach(() => {
    global.FileReader = originalFileReader;
    vi.restoreAllMocks();
  });

  it('renders a hidden file input and a visible trigger button', () => {
    render(<AddFileButton onImageSelect={vi.fn()} />);

    expect(screen.getByTitle('Прикріпити фото')).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toHaveClass('hidden');
  });

  it('opens the native file picker when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddFileButton onImageSelect={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(screen.getByTitle('Прикріпити фото'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onImageSelect with the data URL once a file is selected', async () => {
    const onImageSelect = vi.fn();
    const user = userEvent.setup();
    render(<AddFileButton onImageSelect={onImageSelect} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await user.upload(input, file);

    await waitFor(() => expect(onImageSelect).toHaveBeenCalledWith('data:image/png;base64,mock'));
  });

  it('does not call onImageSelect when no file is chosen', () => {
    const onImageSelect = vi.fn();
    render(<AddFileButton onImageSelect={onImageSelect} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onImageSelect).not.toHaveBeenCalled();
  });
});
