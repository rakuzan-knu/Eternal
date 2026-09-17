import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsentBanner } from '../CookieConsentBanner';
import { useCookieConsentStore } from '../../model/useCookieConsentStore';
import { useLanguageStore } from '../../../../shared/lib/language/languageStore';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useLanguageStore.setState({ currentLanguage: 'English' });
    useCookieConsentStore.setState({
      hasConsented: false,
      isPreferencesOpen: false,
      preferences: {
        strictlyNecessary: true,
        functional: true,
        analytics: false,
      },
    });
  });

  it('renders after mount delay if user has not yet consented', () => {
    render(
      <MemoryRouter>
        <CookieConsentBanner />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument();
    expect(screen.getByText('Accept All')).toBeInTheDocument();
    expect(screen.getByText('Necessary Only')).toBeInTheDocument();
  });

  it('does not render if hasConsented is true', () => {
    useCookieConsentStore.setState({ hasConsented: true });

    render(
      <MemoryRouter>
        <CookieConsentBanner />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
  });

  it('accepts all cookies on Accept All click and sets hasConsented to true', () => {
    render(
      <MemoryRouter>
        <CookieConsentBanner />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });

    const acceptBtn = screen.getByRole('button', { name: /Accept All/i });
    fireEvent.click(acceptBtn);

    expect(useCookieConsentStore.getState().hasConsented).toBe(true);
    expect(useCookieConsentStore.getState().preferences.analytics).toBe(true);
  });
});
