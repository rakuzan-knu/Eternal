import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { PrivacyPage } from '../PrivacyPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Privacy Page Language Switching', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.getState().setLanguage('English');
  });

  it('translates the page dynamically when selecting a language and persists it', () => {
    render(
      <BrowserRouter>
        <PrivacyPage />
      </BrowserRouter>,
    );

    // Starts in English
    expect(screen.getByText(/ETERNAL PRIVACY POLICY/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Briefly about this/i).length).toBeGreaterThan(0);

    // Open language menu and switch to Ukrainian
    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    const ukraineOption = screen.getByRole('button', { name: /Українська/i });
    fireEvent.click(ukraineOption);

    // Check that title and callout changed to Ukrainian
    expect(screen.getByText(/ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ ETERNAL/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Коротко про це/i).length).toBeGreaterThan(0);

    // Verify localStorage has persisted the choice
    expect(useLanguageStore.getState().currentLanguage).toBe('Українська');
  });

  it('does not include Russian in the available language choices', () => {
    render(
      <BrowserRouter>
        <PrivacyPage />
      </BrowserRouter>,
    );

    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    expect(screen.queryByText('Русский')).toBeNull();
  });
});
