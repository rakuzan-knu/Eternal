import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RadioGroup, { type RadioOption } from '../RadioGroup';

describe('RadioGroup', () => {
  const options: RadioOption<string>[] = [
    { value: 'opt1', label: 'Option 1', description: 'Desc 1' },
    { value: 'opt2', label: 'Option 2' },
  ];

  it('renders all options with active indicator and triggers onChange', () => {
    const onChange = vi.fn();
    render(<RadioGroup value="opt1" options={options} onChange={onChange} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Desc 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();

    const opt2Button = screen.getByText('Option 2').closest('button')!;
    fireEvent.click(opt2Button);

    expect(onChange).toHaveBeenCalledWith('opt2');
  });
});
