import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PrivacyPage } from '../PrivacyPage';

describe('PrivacyPage', () => {
  it('renders the clean header title and key policy sections', () => {
    render(
      <BrowserRouter>
        <PrivacyPage />
      </BrowserRouter>,
    );

    // Assert main hero title exists
    expect(screen.getByText(/ETERNAL PRIVACY POLICY/i)).toBeInTheDocument();
    expect(screen.getByText(/Effective Date: September 1, 2026/i)).toBeInTheDocument();

    // Assert Section 1 & Section 2 titles in TOC and headers
    expect(screen.getAllByText(/Welcome to Eternal & The Basics/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/The Information We Collect/i).length).toBeGreaterThanOrEqual(1);

    // Assert Briefly about this callout
    expect(screen.getAllByText(/Briefly about this/i).length).toBeGreaterThan(0);
  });

  it('renders the Discord-identical footer with Eternal branding', () => {
    render(
      <BrowserRouter>
        <PrivacyPage />
      </BrowserRouter>,
    );

    expect(screen.getAllByText('Product').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Company').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Resources').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Policies').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Eternal').length).toBeGreaterThanOrEqual(1);
  });
});
