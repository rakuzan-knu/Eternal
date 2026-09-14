import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyHubPage } from '../PrivacyHubPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('PrivacyHubPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title and 3D illustrations', () => {
    render(
      <MemoryRouter>
        <PrivacyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ETERNAL PRIVACY HUB')).toBeInTheDocument();
    expect(
      screen.getByText(/Because privacy is an essential part of feeling safe/i),
    ).toBeInTheDocument();
    expect(screen.getByAltText('3D Privacy Sunglasses')).toBeInTheDocument();
    expect(screen.getByAltText('3D Security Shield')).toBeInTheDocument();
  });

  it('renders all 4 privacy principles in 2x2 grid', () => {
    render(
      <MemoryRouter>
        <PrivacyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('OUR PRIVACY PRINCIPLES')).toBeInTheDocument();
    expect(screen.getByText("You're in control")).toBeInTheDocument();
    expect(screen.getByText("You're not the product")).toBeInTheDocument();
    expect(screen.getByText('Less data, more transparency')).toBeInTheDocument();
    expect(screen.getByText('With data comes great responsibility')).toBeInTheDocument();
  });

  it('renders privacy preserving products section and opens learn more modal', () => {
    render(
      <MemoryRouter>
        <PrivacyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('PRIVACY PRESERVING PRODUCTS')).toBeInTheDocument();
    const learnMoreBtn = screen.getByRole('button', { name: 'Learn More' });
    expect(learnMoreBtn).toBeInTheDocument();

    fireEvent.click(learnMoreBtn);
    expect(screen.getByText('Privacy-First Architecture at Eternal')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Privacy-First Architecture at Eternal')).not.toBeInTheDocument();
  });

  it('renders privacy policy pills grid with 8 policies', () => {
    render(
      <MemoryRouter>
        <PrivacyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('PRIVACY POLICIES')).toBeInTheDocument();
    expect(screen.getByText('Applicant and Candidate Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
    expect(screen.getByText('Regional Privacy Policies')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Retention Policy')).toBeInTheDocument();
    expect(screen.getByText('Data Privacy Controls')).toBeInTheDocument();
    expect(screen.getByText('Eternal Data Package')).toBeInTheDocument();
  });
});
