import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders its children by default', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies the primary variant classes by default', () => {
    render(<Button>Submit</Button>);

    expect(screen.getByRole('button')).toHaveClass('bg-white', 'text-black');
  });

  it('applies the secondary variant classes when requested', () => {
    render(<Button variant="secondary">Cancel</Button>);

    expect(screen.getByRole('button')).toHaveClass('bg-neutral-900/80');
  });

  it('shows a spinner and hides children while loading', () => {
    render(<Button loading>Submit</Button>);

    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('is disabled while loading', () => {
    render(<Button loading>Submit</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked and not loading', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );

    await user.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards native button attributes such as type', () => {
    render(<Button type="submit">Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
