import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FamilyCenterPanel from '../FamilyCenterPanel';
import { resetFamilyMockState } from '@/test/mocks/handlers/family.handlers';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'usr-parent',
      username: 'ayate',
      displayName: 'Ayate',
      avatar: 'https://example.com/avatar.png',
      birthDate: '1990-05-12', // 36 y.o. adult
    },
  }),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('FamilyCenterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFamilyMockState();
  });

  it('renders slide-over panel with header and 3 sliding tabs', async () => {
    const onClose = vi.fn();
    renderWithRouter(<FamilyCenterPanel onClose={onClose} />);

    // Title
    expect(screen.getByText('Account / Family Center')).toBeInTheDocument();

    // 3 Tabs
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('My Family')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Adult role badge
    expect(screen.getByText(/Your role:/i)).toHaveTextContent(/Parent/i);
  });

  it('renders the Activity hero card, link to /safety-family-center, and 3 explanation cards', async () => {
    const onClose = vi.fn();
    renderWithRouter(<FamilyCenterPanel onClose={onClose} />);

    // Hero card text
    expect(
      screen.getByText(/Stay informed about how your teen uses the platform/i),
    ).toBeInTheDocument();

    // Link to safety family center
    const detailsLink = screen.getByText('Learn more');
    expect(detailsLink).toBeInTheDocument();
    expect(detailsLink.getAttribute('href')).toBe('/safety-family-center');

    // 3 explanation cards
    expect(screen.getByText('Messages Remain Private')).toBeInTheDocument();
    expect(screen.getByText('Transparent Activity Summaries')).toBeInTheDocument();
    expect(screen.getByText('Easy to Connect')).toBeInTheDocument();

    // Tables
    expect(screen.getByText('What connected parents can see')).toBeInTheDocument();
    expect(screen.getByText('New Friends')).toBeInTheDocument();
    expect(screen.getByText('Purchase Amount')).toBeInTheDocument();
    expect(screen.getByText('What connected parents can manage')).toBeInTheDocument();
    expect(screen.getByText('Screen Time Limits')).toBeInTheDocument();
    expect(screen.getByText('What connected parents cannot see')).toBeInTheDocument();
    expect(screen.getByText('What your teen writes or says')).toBeInTheDocument();
  });

  it('clicking "Get Started" on Activity hero smoothly transitions to "My Family" tab', async () => {
    const onClose = vi.fn();
    renderWithRouter(<FamilyCenterPanel onClose={onClose} />);

    const startBtn = screen.getByText('Get Started');
    fireEvent.click(startBtn);

    // Should now show My Family section
    await waitFor(() => {
      expect(screen.getByText(/TEEN ACCOUNTS CONNECTED/i)).toBeInTheDocument();
    });
  });

  it('renders connected children with age badge, action buttons, and safeguards modal', async () => {
    const onClose = vi.fn();
    renderWithRouter(<FamilyCenterPanel onClose={onClose} initialTab="my-family" />);

    await waitFor(() => {
      expect(screen.getByText('Leonid')).toBeInTheDocument();
    });

    expect(screen.getByText('15 years old')).toBeInTheDocument();

    // Open safeguards modal
    const safeguardsBtn = screen.getByText('Safeguards');
    fireEvent.click(safeguardsBtn);

    expect(screen.getByText('Safeguards & Safety Limits')).toBeInTheDocument();
    expect(screen.getByText('Screen Time & Downtime')).toBeInTheDocument();
    expect(screen.getByText('Stranger Message Protection')).toBeInTheDocument();
    expect(screen.getByText('Spending Limits & Purchases')).toBeInTheDocument();
  });

  it('renders settings tab with toggles for email digest, friend alerts, and pin code', async () => {
    const onClose = vi.fn();
    renderWithRouter(<FamilyCenterPanel onClose={onClose} initialTab="settings" />);

    expect(screen.getByText('Family Center Settings')).toBeInTheDocument();
    expect(screen.getByText('Weekly Email Digest')).toBeInTheDocument();
    expect(screen.getByText('New Friend Alerts')).toBeInTheDocument();
    expect(screen.getByText('Report & Safety Alerts')).toBeInTheDocument();
    expect(screen.getByText('Parental PIN Code')).toBeInTheDocument();
  });
});
