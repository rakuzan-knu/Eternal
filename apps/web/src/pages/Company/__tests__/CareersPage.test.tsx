import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CareersPage as PublicCareersPage } from '../CareersPage';
import { CareersPageDesign as CareersPage } from '../CareersPageDesign';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Unpublished Careers design', () => {
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

  it('retains the form design disabled without pretending to send an application', async () => {
    render(
      <MemoryRouter>
        <CareersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/Application Security \(AppSec\) Contributor/i));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Key Tasks & Responsibilities/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'This page does not accept or send applications.',
    );
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'No information has been submitted.',
    );
    for (const input of within(dialog).getAllByRole('textbox')) expect(input).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Submit Application' })).toBeDisabled();
    expect(within(dialog).queryByText(/Application Received/i)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /General project contact/i })).toHaveAttribute(
      'href',
      'mailto:eternalnet.support@proton.me',
    );
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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

describe('Public Careers availability', () => {
  it.each([
    ['English', 'No recruitment announced'],
    ['Українська', 'Набір не оголошено'],
    ['Deutsch', 'Keine Personalsuche angekündigt'],
    ['Español', 'No se ha anunciado una convocatoria'],
    ['Français', 'Aucun recrutement annoncé'],
  ] as const)('keeps unpublished offers and application fields hidden in %s', (language, title) => {
    useLanguageStore.getState().setLanguage(language);
    render(
      <MemoryRouter>
        <PublicCareersPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
    expect(screen.queryByText('Hiring')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Application Security \(AppSec\) Contributor/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(document.querySelector('form')).toBeNull();
    expect(screen.getByRole('link', { name: 'eternalnet.support@proton.me' })).toHaveAttribute(
      'href',
      'mailto:eternalnet.support@proton.me',
    );
  });
});
