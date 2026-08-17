import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextDraftOverlay from '../TextDraftOverlay';

describe('TextDraftOverlay', () => {
  it('renders textarea with draft value and handles change, blur, and Enter key', () => {
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    document.body.appendChild(parent);

    const canvasRef = { current: canvas };
    const onChange = vi.fn();
    const onCommit = vi.fn();

    render(
      <TextDraftOverlay
        canvasRef={canvasRef}
        draft={{ x: 10, y: 20, value: 'Initial text' }}
        color="#ffffff"
        fontSize={16}
        onChange={onChange}
        onCommit={onCommit}
      />,
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('Initial text');

    fireEvent.change(textarea, { target: { value: 'Updated text' } });
    expect(onChange).toHaveBeenCalledWith('Updated text');

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onCommit).toHaveBeenCalledTimes(1);

    fireEvent.blur(textarea);
    expect(onCommit).toHaveBeenCalledTimes(2);

    document.body.removeChild(parent);
  });
});
