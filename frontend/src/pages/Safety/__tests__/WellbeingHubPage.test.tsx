import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WellbeingHubPage } from '../WellbeingHubPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

function renderWithProviders(ui: React.ReactElement, initialRoute = '/safety-wellbeing') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/safety-wellbeing" element={ui} />
        <Route path="/guidelines" element={<div>Community Guidelines</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WellbeingHubPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, subtitle, and 3D illustration badges in English', () => {
    renderWithProviders(<WellbeingHubPage />);

    expect(screen.getByText('ETERNAL WELLBEING HUB')).toBeInTheDocument();
    expect(
      screen.getByText(/Discover resources for ways to protect your wellbeing/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Eternal Mental Health & Balance')).toBeInTheDocument();
  });

  it('renders all 4 empowerment resources including Crisis Text Line badge', () => {
    renderWithProviders(<WellbeingHubPage />);

    expect(screen.getByText('WELLBEING & EMPOWERMENT RESOURCES')).toBeInTheDocument();
    expect(screen.getByText('Eternal Player’s Guide')).toBeInTheDocument();
    expect(screen.getByText('Crisis Text Line')).toBeInTheDocument();
    expect(screen.getByText('Text ETERNAL to 741741')).toBeInTheDocument();
    expect(screen.getByText('ThroughLine')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Promoting Well-Being Through Online Communities: Understanding User Mental Health',
      ),
    ).toBeInTheDocument();
  });

  it('opens and closes the Global Crisis Support Directory modal', () => {
    renderWithProviders(<WellbeingHubPage />);

    const findLocalSupportBtn = screen.getByRole('button', { name: /Find Local Support/i });
    fireEvent.click(findLocalSupportBtn);

    expect(screen.getByText('Global Mental Health & Crisis Support Directory')).toBeInTheDocument();
    expect(screen.getByText(/Ukraine \(Україна\)/i)).toBeInTheDocument();
    expect(screen.getByText(/0 800 500 225 або 116 111/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close Directory/i });
    fireEvent.click(closeBtn);

    expect(
      screen.queryByText('Global Mental Health & Crisis Support Directory'),
    ).not.toBeInTheDocument();
  });

  it('opens and closes the Research Paper Insights modal', () => {
    renderWithProviders(<WellbeingHubPage />);

    const readInsightsBtn = screen.getByRole('button', { name: /Read Research Insights/i });
    fireEvent.click(readInsightsBtn);

    expect(screen.getByText('Adolescent Psychology & Gaming')).toBeInTheDocument();
    expect(
      screen.getByText(/Co-op play reduces cortisol stress levels by up to 24%/i),
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Adolescent Psychology & Gaming')).not.toBeInTheDocument();
  });

  it('renders 4 wellbeing principles and 6 more resources article cards', () => {
    renderWithProviders(<WellbeingHubPage />);

    expect(screen.getByText('WELLBEING & EMPOWERMENT PRINCIPLES')).toBeInTheDocument();
    expect(screen.getByText('Gaming Fosters Meaningful Connection')).toBeInTheDocument();
    expect(screen.getByText('Championing User Agency & Transparency')).toBeInTheDocument();
    expect(screen.getByText('Safety by Design & Proactive Protection')).toBeInTheDocument();
    expect(screen.getByText('Empathy-Driven Community Spaces')).toBeInTheDocument();

    expect(screen.getByText('MORE RESOURCES')).toBeInTheDocument();
    expect(
      screen.getByText('ECPAT x Eternal: What to Do When Online Banter Goes Too Far'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Better Communities Start With Us: Eternal Partners with Youth Advocates'),
    ).toBeInTheDocument();
  });

  it('renders expert quote, Parent Hub, and Teen Charter sections with links', () => {
    renderWithProviders(<WellbeingHubPage />);

    // Expert Quote Section
    expect(screen.getByText('Larry Magid')).toBeInTheDocument();
    expect(screen.getByText('CEO ConnectSafely.org')).toBeInTheDocument();
    expect(screen.getByText('ConnectSafely')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Family Center provides parents with what they need to help guide their teen’s use of Eternal/i,
      ),
    ).toBeInTheDocument();

    // Parent Hub Section
    expect(screen.getByText('PARENT HUB')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Learn more about what we’re doing to help your teen stay safe on our platform/i,
      ),
    ).toBeInTheDocument();

    // Teen Charter Section
    expect(screen.getByText('TEEN CHARTER')).toBeInTheDocument();
    expect(
      screen.getByText(/We work to center youth voices in our product design and policies/i),
    ).toBeInTheDocument();
  });

  it('renders Ukrainian translations correctly', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    renderWithProviders(<WellbeingHubPage />);

    expect(screen.getByText('ХАБ БЛАГОПОЛУЧЧЯ ETERNAL')).toBeInTheDocument();
    expect(screen.getByText('РЕСУРСИ БЛАГОПОЛУЧЧЯ ТА ПІДТРИМКИ')).toBeInTheDocument();
    expect(screen.getByText('Посібник гравця Eternal')).toBeInTheDocument();
    expect(screen.getByText('Надішліть ETERNAL на 741741')).toBeInTheDocument();
    expect(screen.getByText('ПРИНЦИПИ БЛАГОПОЛУЧЧЯ ТА ПІДТРИМКИ')).toBeInTheDocument();
    expect(screen.getByText('Ігри формують щирі зв’язки')).toBeInTheDocument();
    expect(screen.getByText('БІЛЬШЕ РЕСУРСІВ')).toBeInTheDocument();
    expect(screen.getByText('Ларрі Мегід')).toBeInTheDocument();
    expect(screen.getByText('Генеральний директор ConnectSafely.org')).toBeInTheDocument();
    expect(screen.getByText('ХАБ ДЛЯ БАТЬКІВ')).toBeInTheDocument();
    expect(screen.getByText('ХАРТІЯ ПІДЛІТКІВ')).toBeInTheDocument();
  });
});
