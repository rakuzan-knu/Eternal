import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PollCreator } from '../PollCreator';

describe('PollCreator', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PollCreator
        isOpen={false}
        options={{ option1: '', option2: '' }}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders both option inputs with their current values when open', () => {
    render(
      <PollCreator
        isOpen={true}
        options={{ option1: 'Cats', option2: 'Dogs' }}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Варіант 1')).toHaveValue('Cats');
    expect(screen.getByPlaceholderText('Варіант 2')).toHaveValue('Dogs');
  });

  it('calls onChange with the updated option1 value, preserving option2', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PollCreator
        isOpen={true}
        options={{ option1: '', option2: 'Dogs' }}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Варіант 1'), 'C');

    expect(onChange).toHaveBeenCalledWith({ option1: 'C', option2: 'Dogs' });
  });

  it('calls onChange with the updated option2 value, preserving option1', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PollCreator
        isOpen={true}
        options={{ option1: 'Cats', option2: '' }}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Варіант 2'), 'D');

    expect(onChange).toHaveBeenCalledWith({ option1: 'Cats', option2: 'D' });
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PollCreator
        isOpen={true}
        options={{ option1: '', option2: '' }}
        onChange={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
