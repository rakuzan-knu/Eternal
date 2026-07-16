import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddFileButton } from '../AddFileButton';

describe('AddFileButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a hidden file input and a visible trigger button', () => {
    render(<AddFileButton onFilesSelect={vi.fn()} />);

    expect(document.querySelector('input[type="file"]')).toHaveClass('hidden');
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens the native file picker when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddFileButton onFilesSelect={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(screen.getByRole('button'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onFilesSelect with the picked file', async () => {
    const onFilesSelect = vi.fn();
    const user = userEvent.setup();
    render(<AddFileButton onFilesSelect={onFilesSelect} multiple />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await user.upload(input, file);

    expect(onFilesSelect).toHaveBeenCalledWith([file]);
  });

  it('does not call onFilesSelect when no file is chosen', () => {
    const onFilesSelect = vi.fn();
    render(<AddFileButton onFilesSelect={onFilesSelect} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onFilesSelect).not.toHaveBeenCalled();
  });

  it('does not open the file picker when disabled', async () => {
    const user = userEvent.setup();
    render(<AddFileButton onFilesSelect={vi.fn()} disabled />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(screen.getByRole('button'));

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
