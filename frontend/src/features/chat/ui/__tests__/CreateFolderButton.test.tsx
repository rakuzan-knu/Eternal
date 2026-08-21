import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateFolderButton from '../CreateFolderButton';
import React from 'react';

describe('CreateFolderButton', () => {
  it('renders button and calls onCreate on click', () => {
    const onCreate = vi.fn();
    render(<CreateFolderButton onCreate={onCreate} />);

    const btn = screen.getByRole('button', { name: 'Create chat folder' });
    fireEvent.click(btn);
    expect(onCreate).toHaveBeenCalled();
  });
});
