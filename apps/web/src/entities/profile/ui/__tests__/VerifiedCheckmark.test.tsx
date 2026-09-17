import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerifiedCheckmark } from '../VerifiedCheckmark';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('VerifiedCheckmark', () => {
  it('renders verified svg badge with proper title when isVerified is true', () => {
    const { container } = renderWithClient(<VerifiedCheckmark isVerified size="md" />);
    const badge = screen.getByTitle('Verified Profile');
    expect(badge).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders nothing when not verified and no primary badge', () => {
    const { container } = renderWithClient(
      <VerifiedCheckmark isVerified={false} primaryBadge={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('falls back to default size when unknown size is passed, and renders primaryBadge', () => {
    const { container } = renderWithClient(
      <VerifiedCheckmark size={'custom' as any} primaryBadge="DEVELOPER" />,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();

    const { container: cXs } = renderWithClient(
      <VerifiedCheckmark size="xs" primaryBadge="DEVELOPER" />,
    );
    expect(cXs.querySelector('svg')).toBeInTheDocument();
  });
});
