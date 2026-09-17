import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { screen } from '@testing-library/react';

describe('renderWithProviders utility', () => {
  it('renders components with QueryClientProvider and MemoryRouter wrapper', () => {
    renderWithProviders(<div data-testid="test-provider-child">Child Component</div>);

    expect(screen.getByTestId('test-provider-child')).toBeInTheDocument();
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });

  it('supports initialEntries option for memory router', () => {
    renderWithProviders(<div>Custom Route Child</div>, {
      initialEntries: ['/custom-route'],
    });

    expect(screen.getByText('Custom Route Child')).toBeInTheDocument();
  });
});
