import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('renders a plain input without a label by default', () => {
    render(<Input placeholder="Type here" />);

    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the label when provided', () => {
    render(<Input label="Email" placeholder="you@example.com" />);

    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders the error message when provided', () => {
    render(<Input placeholder="Email" error="Required field" />);

    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('does not render an error message when none is provided', () => {
    render(<Input placeholder="Email" />);

    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it('renders a right element when provided', () => {
    render(<Input placeholder="Password" rightElement={<span data-testid="icon">👁</span>} />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('lets the user type into the field', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Username" />);

    await user.type(screen.getByPlaceholderText('Username'), 'ayate');

    expect(screen.getByPlaceholderText('Username')).toHaveValue('ayate');
  });

  it('forwards the ref to the underlying input element', () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input ref={ref} placeholder="Focus me" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByPlaceholderText('Focus me'));
  });
});
