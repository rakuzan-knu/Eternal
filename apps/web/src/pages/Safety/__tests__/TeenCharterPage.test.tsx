import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TeenCharterPage } from '../TeenCharterPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

function renderWithProviders(ui: React.ReactElement, initialRoute = '/safety-teen-charter') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/safety-teen-charter" element={ui} />
        <Route path="/safety" element={<div>Safety Center</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeenCharterPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title and subtitle in English', () => {
    renderWithProviders(<TeenCharterPage />);
    expect(
      screen.getByText('A CHARTER FOR A BETTER PLACE TO PLAY & CHILL TOGETHER'),
    ).toBeInTheDocument();
    expect(screen.getByText('Created with teens, for teens.')).toBeInTheDocument();
  });

  it('renders the surprise intro section and 4 charter pillars', () => {
    renderWithProviders(<TeenCharterPage />);
    expect(screen.getByText('THIS MAY COME AS A SURPRISE,')).toBeInTheDocument();
    expect(screen.getByText(/the person writing these words is not a teen/i)).toBeInTheDocument();

    // 4 pillars
    expect(screen.getByText('AUTHENTICITY')).toBeInTheDocument();
    expect(screen.getByText('PRIVACY')).toBeInTheDocument();
    expect(screen.getByText('RESPECT & INCLUSIVITY')).toBeInTheDocument();
    expect(screen.getByText('AGENCY & CONTROL')).toBeInTheDocument();
  });

  it('renders It Takes A Village section with community checkpoints', () => {
    renderWithProviders(<TeenCharterPage />);
    expect(screen.getByText('IT TAKES A VILLAGE')).toBeInTheDocument();
    expect(screen.getByText('Moderator & Admin Leadership')).toBeInTheDocument();
    expect(screen.getByText('Proactive Safety Tools')).toBeInTheDocument();
  });

  it('handles interactive quiz voting and provides instant feedback', () => {
    renderWithProviders(<TeenCharterPage />);
    expect(screen.getByText('RECOGNIZING POOR FORM')).toBeInTheDocument();
    expect(
      screen.getByText("Do you think Harper's message in this GDM is acceptable conduct?"),
    ).toBeInTheDocument();

    // Find unacceptable buttons
    const unacceptableButtons = screen.getAllByRole('button', { name: /Unacceptable/i });
    expect(unacceptableButtons.length).toBeGreaterThan(0);

    // Vote unacceptable on the first quiz question (Harper's harassment)
    fireEvent.click(unacceptableButtons[0]);

    // Feedback should appear
    expect(screen.getByText('Correct! That is unacceptable conduct.')).toBeInTheDocument();
  });

  it('renders and navigates the partner testimonials slider', () => {
    renderWithProviders(<TeenCharterPage />);

    // Initial slide: Boston Children's
    expect(screen.getByText("Boston Children's")).toBeInTheDocument();
    expect(screen.getAllByText('Digital Wellness Lab').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Digital Wellness Lab at Boston Children's Hospital is a nonprofit research institution/i,
      ),
    ).toBeInTheDocument();

    // Click Next Slide Arrow
    const nextBtns = screen.getAllByRole('button', { name: /Next partner slide/i });
    fireEvent.click(nextBtns[0]);

    // Slide 2: NoFiltr / Thorn
    expect(screen.getByLabelText('NŌFILTR THORN')).toBeInTheDocument();
    expect(screen.getByText('THORN')).toBeInTheDocument();
    expect(
      screen.getByText(/NoFiltr is a leading digital safety initiative, powered by Thorn/i),
    ).toBeInTheDocument();

    // Click 3rd dot pagination
    const dot3 = screen.getByRole('button', { name: 'Go to slide 3' });
    fireEvent.click(dot3);

    // Slide 3: ThinkYoung
    expect(screen.getByText('Think')).toBeInTheDocument();
    expect(screen.getByText('Young')).toBeInTheDocument();
    expect(
      screen.getByText(
        /ThinkYoung is a not-for-profit organization, aiming to make the world a better place/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders Ukrainian translations correctly', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    renderWithProviders(<TeenCharterPage />);

    expect(
      screen.getByText('ХАРТІЯ ДЛЯ КРАЩОГО ПРОСТОРУ, ЩОБ ГРАТИ ТА ВІДПОЧИВАТИ РАЗОМ'),
    ).toBeInTheDocument();
    expect(screen.getByText('ЦЕ МОЖЕ СТАТИ НЕСПОДІВАНКОЮ,')).toBeInTheDocument();
    expect(screen.getByText('АВТЕНТИЧНІСТЬ')).toBeInTheDocument();
    expect(screen.getByText('СПІЛЬНА ВІДПОВІДАЛЬНІСТЬ')).toBeInTheDocument();
    expect(screen.getByText('РОЗПІЗНАВАННЯ НЕПРИПУСТИМОЇ ПОВЕДІНКИ')).toBeInTheDocument();
    expect(
      screen.getByText(/Digital Wellness Lab при Бостонській дитячій лікарні/i),
    ).toBeInTheDocument();
  });
});
