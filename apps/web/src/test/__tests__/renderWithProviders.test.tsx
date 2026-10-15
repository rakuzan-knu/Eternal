import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { fireEvent, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

describe('renderWithProviders utility', () => {
  it('preserves the query cache and router when rerendering a consumer', () => {
    function Consumer({ label }: { label: string }) {
      const client = useQueryClient();
      const location = useLocation();
      const navigate = useNavigate();
      return (
        <button
          onClick={() => {
            client.setQueryData(['draft'], 'saved draft');
            navigate('/conversation/draft');
          }}
        >
          {label}: {location.pathname}: {client.getQueryData<string>(['draft'])}
        </button>
      );
    }

    const { rerender } = renderWithProviders(<Consumer label="Initial" />, {
      initialEntries: ['/conversation'],
    });
    fireEvent.click(screen.getByRole('button'));
    rerender(<Consumer label="Updated" />);
    expect(screen.getByRole('button')).toHaveTextContent(
      'Updated: /conversation/draft: saved draft',
    );
  });

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
