import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionButton, ExpandableSection } from '../SectionButton';
import { Bell } from 'lucide-react';
import React from 'react';

describe('SectionButton and ExpandableSection', () => {
  it('renders section button with label and sublabel', () => {
    const onClick = vi.fn();
    render(
      <SectionButton
        icon={<Bell size={16} />}
        label="Notifications"
        sublabel="Enabled"
        onClick={onClick}
      />,
    );

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders expandable section when open', () => {
    const onToggle = vi.fn();
    render(
      <ExpandableSection label="Options" isOpen={true} onToggle={onToggle}>
        <div>Section Content</div>
      </ExpandableSection>,
    );

    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('Section Content')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Options'));
    expect(onToggle).toHaveBeenCalled();
  });
});
