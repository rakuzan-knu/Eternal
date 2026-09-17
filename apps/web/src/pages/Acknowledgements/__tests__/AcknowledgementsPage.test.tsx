import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AcknowledgementsPage } from '../AcknowledgementsPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Acknowledgements Page', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders the Acknowledgements header and open source libraries list', () => {
    render(
      <BrowserRouter>
        <AcknowledgementsPage />
      </BrowserRouter>,
    );

    expect(screen.getAllByText(/ACKNOWLEDGEMENTS/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/These are the open source libraries we use to make Eternal:/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('react').length).toBeGreaterThan(0);
    expect(screen.getAllByText('zustand').length).toBeGreaterThan(0);
    expect(screen.getAllByText('@tanstack/react-query').length).toBeGreaterThan(0);
  });

  it('filters libraries on search without showing duplicates', () => {
    render(
      <BrowserRouter>
        <AcknowledgementsPage />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText(/Search open source libraries.../i);
    fireEvent.change(searchInput, { target: { value: 'sanitize-html' } });

    // When searching, sanitize-html must appear exactly ONCE in the list
    expect(screen.getAllByText('sanitize-html')).toHaveLength(1);
    expect(screen.getByText(/eternal-credits.sh --total=1/i)).toBeInTheDocument();
  });

  it('opens Telegram-style speed controller and changes speed', () => {
    render(
      <BrowserRouter>
        <AcknowledgementsPage />
      </BrowserRouter>,
    );

    const speedBtn = screen.getByTitle(/Change scrolling speed/i);
    fireEvent.click(speedBtn);

    // Speed menu popover should appear with options
    expect(screen.getByText(/Super fast/i)).toBeInTheDocument();

    const fastOption = screen.getByText(/Super fast/i);
    fireEvent.click(fastOption);

    expect(screen.getAllByText(/2.0x/i).length).toBeGreaterThan(0);
  });

  it('switches to Ukrainian dynamically and updates title', () => {
    render(
      <BrowserRouter>
        <AcknowledgementsPage />
      </BrowserRouter>,
    );

    // Open language menu and switch to Ukrainian
    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    const ukraineOption = screen.getByRole('button', { name: /Українська/i });
    fireEvent.click(ukraineOption);

    expect(screen.getAllByText(/ПОДЯКИ ВІДКРИТОМУ КОДУ/i).length).toBeGreaterThan(0);
  });
});
