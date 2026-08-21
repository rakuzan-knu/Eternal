import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../Select';

const OPTIONS = ['Alpha', 'Beta', 'Gamma'];

describe('Select', () => {
  it('renders the current value on the trigger button', () => {
    render(<Select value="Beta" onChange={vi.fn()} options={OPTIONS} />);

    expect(screen.getByRole('combobox')).toHaveTextContent('Beta');
  });

  it('does not render the option list when closed', () => {
    render(<Select value="Beta" onChange={vi.fn()} options={OPTIONS} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the option list when the trigger is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Select value="Beta" onChange={vi.fn()} options={OPTIONS} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onChange and closes the list when an option is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<Select value="Beta" onChange={onChange} options={OPTIONS} />);
    await user.click(screen.getByRole('combobox'));

    await user.click(screen.getByText('Gamma'));

    expect(onChange).toHaveBeenCalledWith('Gamma');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the currently selected option with aria-selected', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Select value="Beta" onChange={vi.fn()} options={OPTIONS} />);

    await user.click(screen.getByRole('combobox'));

    const list = within(screen.getByRole('listbox'));
    expect(list.getByText('Beta').closest('li')).toHaveAttribute('aria-selected', 'true');
    expect(list.getByText('Alpha').closest('li')).toHaveAttribute('aria-selected', 'false');
  });

  it('closes the list and calls onBlur when clicking outside', async () => {
    const onBlur = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(
      <div>
        <Select value="Beta" onChange={vi.fn()} options={OPTIONS} onBlur={onBlur} />
        <button>outside</button>
      </div>,
    );
    await user.click(screen.getByRole('combobox'));

    await user.click(screen.getByText('outside'));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onBlur).toHaveBeenCalled();
  });

  it('opens the list on ArrowDown when closed', () => {
    render(<Select value="Beta" onChange={vi.fn()} options={OPTIONS} />);

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('selects the highlighted option on Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<Select value="Beta" onChange={onChange} options={OPTIONS} />);
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Gamma');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('wraps to the first option when ArrowDown is pressed on the last option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<Select value="Gamma" onChange={onChange} options={OPTIONS} />);
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Alpha');
  });

  it('wraps to the last option when ArrowUp is pressed on the first option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<Select value="Alpha" onChange={onChange} options={OPTIONS} />);
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    fireEvent.keyDown(combobox, { key: 'ArrowUp' });
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Gamma');
  });

  it('closes without selecting on Escape', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<Select value="Beta" onChange={onChange} options={OPTIONS} />);
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    fireEvent.keyDown(combobox, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes and calls onBlur on Tab', async () => {
    const onBlur = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<Select value="Beta" onChange={vi.fn()} options={OPTIONS} onBlur={onBlur} />);
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    fireEvent.keyDown(combobox, { key: 'Tab' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
