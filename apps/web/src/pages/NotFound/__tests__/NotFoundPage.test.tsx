import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '../NotFoundPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';

describe('NotFoundPage (404)', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
    useAuthStore.setState({ isAuthenticated: false });
  });

  it('renders 404 narrative title, Milky Way story, and guest navigation options', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('LOST IN THE MILKY WAY?')).toBeInTheDocument();
    expect(screen.getByText(/cosmic stardust trail/i)).toBeInTheDocument();
    expect(screen.getByText('Go to Home / Login')).toBeInTheDocument();
    expect(screen.getByText('Download Eternal')).toBeInTheDocument();
  });

  it('renders authenticated navigation options when user is logged in', () => {
    useAuthStore.setState({ isAuthenticated: true });

    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Return to Feed')).toBeInTheDocument();
    expect(screen.getByText('Open Messages')).toBeInTheDocument();
  });

  it('renders clean helpful quick directory link list', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Status Page')).toBeInTheDocument();
    expect(screen.getByText('@Eternal')).toBeInTheDocument();
    expect(screen.getByText('Eternal Support')).toBeInTheDocument();
    expect(screen.getByText('Terms & Privacy')).toBeInTheDocument();
    expect(screen.getAllByText('Careers').length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ЗАГУБИЛИСЯ У ЧУМАЦЬКОМУ ШЛЯХУ?')).toBeInTheDocument();
    expect(screen.getByText(/зоряну стежку Чумацького Шляху/i)).toBeInTheDocument();
    expect(screen.getByText('На головну / Увійти')).toBeInTheDocument();
    expect(screen.getByText('Сторінка статусу')).toBeInTheDocument();
    expect(screen.getByText('Підтримка Eternal')).toBeInTheDocument();
  });
});
