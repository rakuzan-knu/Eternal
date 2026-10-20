import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordRequirements } from '../PasswordRequirements';

describe('PasswordRequirements', () => {
  it('starts with grey circles, changes through yellow and green, and flags non-Latin letters red', () => {
    const { rerender } = render(<PasswordRequirements password="" />);
    expect(screen.getByLabelText('8+ characters: Not met').querySelector('span')).toHaveClass(
      'border-neutral-600',
    );

    rerender(<PasswordRequirements password="abc" />);
    expect(screen.getByLabelText('8+ characters: Partially met').querySelector('span')).toHaveClass(
      'border-yellow-500',
    );
    expect(screen.getByLabelText('Latin letters (A-Z, a-z): Partially met')).toBeInTheDocument();

    rerender(<PasswordRequirements password="Abcdefg1" />);
    expect(screen.getByLabelText('8+ characters: Met').querySelector('svg')).toHaveClass(
      'text-emerald-500',
    );
    expect(screen.getByLabelText('Latin letters (A-Z, a-z): Met')).toBeInTheDocument();
    expect(screen.getByLabelText('Number or symbol: Met')).toBeInTheDocument();

    rerender(<PasswordRequirements password="AbcЖ1234" />);
    expect(
      screen.getByLabelText('Latin letters (A-Z, a-z): Invalid').querySelector('svg'),
    ).toHaveClass('text-red-500');
  });

  it('accepts a special symbol without requiring a number, like mobile', () => {
    render(<PasswordRequirements password="Abcdefg!" />);
    expect(screen.getByLabelText('Number or symbol: Met')).toBeInTheDocument();
  });
});
