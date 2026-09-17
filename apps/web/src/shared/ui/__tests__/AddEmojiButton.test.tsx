import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddEmojiButton } from '../AddEmojiButton';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) => (
    <button data-testid="mock-emoji-picker" onClick={() => onEmojiClick({ emoji: '😀' })}>
      mock-emoji-picker
    </button>
  ),
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

function mockBoundingRectTop(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 40,
    left: 100,
    right: 140,
    width: 40,
    height: 40,
    x: 100,
    y: top,
    toJSON: () => {},
  });
}

describe('AddEmojiButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render the picker when isOpen is false', () => {
    render(<AddEmojiButton isOpen={false} onToggle={vi.fn()} onEmojiSelect={vi.fn()} />);

    expect(screen.queryByTestId('mock-emoji-picker')).not.toBeInTheDocument();
  });

  it('renders the picker when isOpen is true', async () => {
    render(<AddEmojiButton isOpen={true} onToggle={vi.fn()} onEmojiSelect={vi.fn()} />);

    expect(await screen.findByTestId('mock-emoji-picker')).toBeInTheDocument();
  });

  it('calls onToggle when the trigger button is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<AddEmojiButton isOpen={false} onToggle={onToggle} onEmojiSelect={vi.fn()} />);

    await user.click(screen.getByTitle('Add Emoji'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onEmojiSelect with the picked emoji', async () => {
    const onEmojiSelect = vi.fn();
    const user = userEvent.setup();
    render(<AddEmojiButton isOpen={true} onToggle={vi.fn()} onEmojiSelect={onEmojiSelect} />);

    await user.click(await screen.findByTestId('mock-emoji-picker'));

    expect(onEmojiSelect).toHaveBeenCalledWith('😀');
  });

  it('opens above the button (bottom-full) when there is enough room above (rect.top >= 380)', async () => {
    mockBoundingRectTop(500);
    const user = userEvent.setup();
    const { rerender } = render(
      <AddEmojiButton isOpen={false} onToggle={vi.fn()} onEmojiSelect={vi.fn()} />,
    );

    await user.click(screen.getByTitle('Add Emoji'));
    rerender(<AddEmojiButton isOpen={true} onToggle={vi.fn()} onEmojiSelect={vi.fn()} />);

    const picker = await screen.findByTestId('mock-emoji-picker');
    expect(picker.closest('div.absolute')).toHaveClass('bottom-full', 'mb-3');
  });

  it('opens below the button (top-full) when there is not enough room above (rect.top < 380)', async () => {
    mockBoundingRectTop(100);
    const user = userEvent.setup();
    const { rerender } = render(
      <AddEmojiButton isOpen={false} onToggle={vi.fn()} onEmojiSelect={vi.fn()} />,
    );

    await user.click(screen.getByTitle('Add Emoji'));
    rerender(<AddEmojiButton isOpen={true} onToggle={vi.fn()} onEmojiSelect={vi.fn()} />);

    const picker = await screen.findByTestId('mock-emoji-picker');
    expect(picker.closest('div.absolute')).toHaveClass('top-full', 'mt-3');
  });

  it('supports usePortal and positions fixed with forceDirection', async () => {
    mockBoundingRectTop(200);
    const onToggle = vi.fn();
    render(
      <AddEmojiButton
        isOpen={true}
        onToggle={onToggle}
        onEmojiSelect={vi.fn()}
        usePortal={true}
        forceDirection="top"
      />,
    );

    expect(await screen.findByTestId('mock-emoji-picker')).toBeInTheDocument();

    // Trigger window resize and scroll
    fireEvent(window, new Event('resize'));
    fireEvent(window, new Event('scroll'));
  });

  it('closes when clicking outside or pressing Escape', async () => {
    const onToggle = vi.fn();
    render(
      <div>
        <div data-testid="outside-element">Outside</div>
        <AddEmojiButton isOpen={true} onToggle={onToggle} onEmojiSelect={vi.fn()} />
      </div>,
    );

    expect(await screen.findByTestId('mock-emoji-picker')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('calculates auto portal direction when forceDirection is omitted', async () => {
    // When space below is small, opens top
    mockBoundingRectTop(600);
    render(
      <AddEmojiButton isOpen={true} onToggle={vi.fn()} onEmojiSelect={vi.fn()} usePortal={true} />,
    );
    expect(await screen.findByTestId('mock-emoji-picker')).toBeInTheDocument();
  });
});
