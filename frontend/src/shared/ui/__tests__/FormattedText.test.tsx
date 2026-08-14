import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormattedText } from '../FormattedText';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FormattedText', () => {
  it('renders regular text as normal strings', () => {
    renderWithProviders(<FormattedText text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders @mentions as blue links to user profiles', () => {
    renderWithProviders(<FormattedText text="Hey @alexmercer check this out!" />);

    const link = screen.getByText('@alexmercer');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/profile/alexmercer');
  });

  it('correctly trims punctuation from the end of @mentions', () => {
    renderWithProviders(<FormattedText text="Hey @alexmercer, look at this! (@sofia)." />);

    const link1 = screen.getByText('@alexmercer');
    expect(link1).toBeInTheDocument();
    expect(link1.closest('a')).toHaveAttribute('href', '/profile/alexmercer');

    const link2 = screen.getByText('@sofia');
    expect(link2).toBeInTheDocument();
    expect(link2.closest('a')).toHaveAttribute('href', '/profile/sofia');
  });

  it('renders #hashtags as blue links to search page', () => {
    renderWithProviders(<FormattedText text="Loving the vibe #nature #sunset" />);

    const hash1 = screen.getByText('#nature');
    const hash2 = screen.getByText('#sunset');
    expect(hash1).toBeInTheDocument();
    expect(hash2).toBeInTheDocument();
    expect(hash1.closest('a')).toHaveAttribute('href', '/search?q=%23nature');
  });

  it('correctly trims punctuation from the end of #hashtags', () => {
    renderWithProviders(<FormattedText text="Loving the vibe #nature, #sunset!" />);

    const hash1 = screen.getByText('#nature');
    const hash2 = screen.getByText('#sunset');
    expect(hash1).toBeInTheDocument();
    expect(hash2).toBeInTheDocument();
    expect(hash1.closest('a')).toHaveAttribute('href', '/search?q=%23nature');
    expect(hash2.closest('a')).toHaveAttribute('href', '/search?q=%23sunset');
  });
});
