import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CareersPage } from '../CareersPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Careers Page (/careers, /jobs)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders the Careers header, mascots, platform carousel, job openings, and all 3 extra sections', () => {
    render(
      <MemoryRouter>
        <CareersPage />
      </MemoryRouter>,
    );

    // Hero Title & CTA
    expect(screen.getByRole('heading', { level: 1, name: /WORK AT ETERNAL/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /See All Jobs/i })).toBeInTheDocument();

    // Mission & Culture Headings
    expect(
      screen.getByRole('heading', { level: 2, name: /BE A PART OF THE FUTURE OF SOCIAL MEDIAS/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /WORK WITH PEOPLE JUST AS PASSIONATE AS YOU/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /WHERE EVERY IDEA IS HEARD AND VALUED/i }),
    ).toBeInTheDocument();

    // Jobs Section
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /DON’T JUST IMAGINE THE FUTURE OF SOCIAL MEDIA/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Application Security \(AppSec\) Contributor/i)).toBeInTheDocument();
    expect(screen.getByText(/WebRTC & Audio Systems Intern/i)).toBeInTheDocument();
    expect(screen.getByText(/UI\/UX & Motion Designer/i)).toBeInTheDocument();

    // 1. Experience Life at Eternal (Why Join the Early Team)
    expect(
      screen.getByRole('heading', { level: 2, name: /EXPERIENCE LIFE AT ETERNAL/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Real Production Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Strong Portfolio & References/i)).toBeInTheDocument();
    expect(screen.getByText(/Flexible Student Schedule/i)).toBeInTheDocument();

    // 2. When It's Time for Fun
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /WHEN IT’S TIME FOR FUN, FIND YOUR PARTY HERE/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Devs & Hackers/i)).toBeInTheDocument();
    expect(screen.getByText(/Sound & Music Lounge/i)).toBeInTheDocument();

    // 3. FAQ Section
    expect(screen.getByRole('heading', { level: 2, name: /QUESTIONS\?/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /How does the early contributor and internship format work without direct salary\?/i,
      ),
    ).toBeInTheDocument();
  });

  it('opens and submits the job application details modal', async () => {
    render(
      <MemoryRouter>
        <CareersPage />
      </MemoryRouter>,
    );

    // Click on AppSec position card
    const appSecCard = screen.getByText(/Application Security \(AppSec\) Contributor/i);
    fireEvent.click(appSecCard);

    // Modal opens
    expect(screen.getByText(/Key Tasks & Responsibilities/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nikolaj \/ Ilya \/ Elena/i)).toBeInTheDocument();

    // Fill form and submit
    fireEvent.change(screen.getByPlaceholderText(/Nikolaj \/ Ilya \/ Elena/i), {
      target: { value: 'Nikolaj Contributor' },
    });
    fireEvent.change(screen.getByPlaceholderText(/@telegram or you@email.com/i), {
      target: { value: '@nikolaj_sec' },
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Application/i });
    fireEvent.click(submitBtn);

    // Should render without error
    expect(submitBtn).toBeInTheDocument();
  });

  it('switches to Ukrainian dynamically and updates all titles and FAQ content', () => {
    useLanguageStore.getState().setLanguage('Українська');

    render(
      <MemoryRouter>
        <CareersPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /РОБОТА В ETERNAL/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /СТАНЬ ЧАСТИНОЮ МАЙБУТНЬОГО СОЦМЕРЕЖ/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /НЕ ПРОСТО УЯВЛЯЙТЕ МАЙБУТНЄ СОЦМЕРЕЖ/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ЖИТТЯ ТА ДОСВІД В ETERNAL/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /КОЛИ ЧАС ВІДПОЧИТИ — ЗНАХОДЬ СВОЮ КОМПАНІЮ/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /ЗАПИТАННЯ\?/i })).toBeInTheDocument();
    expect(screen.getByText(/Реальний Продакшн Досвід/i)).toBeInTheDocument();
  });
});
