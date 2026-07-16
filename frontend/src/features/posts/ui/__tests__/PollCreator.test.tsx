import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PollCreator } from '../PollCreator';
import { PollOptionDraft } from '../../model/types';

function makeOptions(...texts: string[]): PollOptionDraft[] {
  return texts.map((text, i) => ({ id: `opt-${i}`, text }));
}

describe('PollCreator', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PollCreator
        isOpen={false}
        options={makeOptions('', '')}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders an input for each option with its current value when open', () => {
    render(
      <PollCreator
        isOpen={true}
        options={makeOptions('Cats', 'Dogs')}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Варіант 1')).toHaveValue('Cats');
    expect(screen.getByPlaceholderText('Варіант 2')).toHaveValue('Dogs');
  });

  it('calls onChange with the updated text for the edited option, preserving the others', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PollCreator
        isOpen={true}
        options={makeOptions('', 'Dogs')}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Варіант 1'), 'C');

    expect(onChange).toHaveBeenCalledWith([
      { id: 'opt-0', text: 'C' },
      { id: 'opt-1', text: 'Dogs' },
    ]);
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PollCreator
        isOpen={true}
        options={makeOptions('', '')}
        onChange={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('adds a new empty option when "add option" is clicked, up to a max of 8', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PollCreator
        isOpen={true}
        options={makeOptions('Cats', 'Dogs')}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByText(/Додати варіант/));

    expect(onChange).toHaveBeenCalledWith([
      { id: 'opt-0', text: 'Cats' },
      { id: 'opt-1', text: 'Dogs' },
      { id: expect.any(String), text: '' },
    ]);
  });

  it('removes an option when its own remove button is clicked, once above the minimum of 2', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PollCreator
        isOpen={true}
        options={makeOptions('Cats', 'Dogs', 'Birds')}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getAllByRole('button')[1]);

    expect(onChange).toHaveBeenCalledWith([
      { id: 'opt-1', text: 'Dogs' },
      { id: 'opt-2', text: 'Birds' },
    ]);
  });

  it('does not show a remove button for either option at the 2-option minimum', () => {
    render(
      <PollCreator
        isOpen={true}
        options={makeOptions('Cats', 'Dogs')}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
