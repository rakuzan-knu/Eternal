import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GenericPreview from '../GenericPreview';

describe('GenericPreview', () => {
  it('renders generic preview for everybody', () => {
    render(<GenericPreview dimension="LAST_SEEN" value="EVERYBODY" hidden={false} />);
    expect(screen.getByText('How others see it')).toBeInTheDocument();
  });

  it('renders generic preview for contacts', () => {
    render(<GenericPreview dimension="LAST_SEEN" value="CONTACTS" hidden={false} />);
    expect(screen.getByText('How subscribers see it')).toBeInTheDocument();
  });

  it('renders generic preview when hidden', () => {
    render(<GenericPreview dimension="MESSAGES" value="NOBODY" hidden={true} />);
    expect(screen.getByText('How others see it')).toBeInTheDocument();
  });
});
