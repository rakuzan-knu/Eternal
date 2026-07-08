import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlassCard } from '../GlassCard';

describe('GlassCard', () => {
  it('renders its children', () => {
    render(
      <GlassCard>
        <span>Inside</span>
      </GlassCard>,
    );

    expect(screen.getByText('Inside')).toBeInTheDocument();
  });

  it('merges a custom className with the base styles', () => {
    render(<GlassCard className="custom-class">content</GlassCard>);

    expect(screen.getByText('content')).toHaveClass('custom-class', 'bg-neutral-900/50');
  });

  it('forwards additional HTML attributes to the underlying div', () => {
    render(<GlassCard data-testid="glass-card">content</GlassCard>);

    expect(screen.getByTestId('glass-card')).toBeInTheDocument();
  });
});
