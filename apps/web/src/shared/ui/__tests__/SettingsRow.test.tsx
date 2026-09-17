import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsRow from '../SettingsRow';

describe('SettingsRow', () => {
  it('renders title, subtitle, value and responds to click', () => {
    const onClick = vi.fn();
    render(
      <SettingsRow
        icon={<span data-testid="row-icon">*</span>}
        title="Privacy"
        subtitle="Manage your visibility"
        value="Everyone"
        onClick={onClick}
      />,
    );

    expect(screen.getByTestId('row-icon')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Manage your visibility')).toBeInTheDocument();
    expect(screen.getByText('Everyone')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies danger styles and handles last prop', () => {
    render(
      <SettingsRow
        icon={<span>!</span>}
        title="Delete Account"
        onClick={vi.fn()}
        danger={true}
        last={true}
      />,
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('border-b');
    expect(screen.getByText('Delete Account')).toHaveClass('text-red-400');
  });
});
