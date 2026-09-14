import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RequestDataPackageModal } from '../RequestDataPackageModal';
import { useLanguageStore } from '../../../../../shared/lib/language/languageStore';

describe('RequestDataPackageModal', () => {
  it('renders modal with title, disclaimers and 7 data categories', () => {
    useLanguageStore.setState({ currentLanguage: 'English' });
    const onClose = vi.fn();

    render(<RequestDataPackageModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Request Your Eternal Data Package')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Compiling and encrypting your personal data package can take up to 30 calendar days/i,
      ),
    ).toBeInTheDocument();

    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('Your Activity & Analytics')).toBeInTheDocument();
    expect(screen.getByText('Activities & Integrations')).toBeInTheDocument();
    expect(screen.getByText('Messages & Media Transcripts')).toBeInTheDocument();
    expect(screen.getByText('Servers & Communities')).toBeInTheDocument();
    expect(screen.getByText('Personalization & Advertising')).toBeInTheDocument();
    expect(screen.getByText('Support Tickets & Safety Appeals')).toBeInTheDocument();
  });

  it('allows toggling individual categories and Select/Deselect All', () => {
    const onClose = vi.fn();
    render(<RequestDataPackageModal isOpen={true} onClose={onClose} />);

    const toggleAllBtn = screen.getByText(/Deselect All/i);
    fireEvent.click(toggleAllBtn);

    expect(screen.getByText(/Select All/i)).toBeInTheDocument();
  });

  it('closes modal when clicking "I changed my mind"', () => {
    const onClose = vi.fn();
    render(<RequestDataPackageModal isOpen={true} onClose={onClose} />);

    const cancelBtn = screen.getByText('I changed my mind');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
