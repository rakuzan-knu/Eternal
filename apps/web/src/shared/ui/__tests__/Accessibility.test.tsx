import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from '../Modal';
import Tooltip from '../Tooltip';
import DropdownMenu from '../DropdownMenu';
import { Input } from '../Input';
import RadioGroup from '../RadioGroup';
import ProfileTabs, { type ProfileTabType } from '../ProfileTabs';

describe('shared control accessibility', () => {
  it('connects unique input labels and errors while preserving help text and supplied IDs', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <p id="email-help">Work address</p>
        <Input id="email" label="Email" error="Required" aria-describedby="email-help" />
        <Input label="Username" />
      </>,
    );
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveAttribute('id', 'email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Work address Required');
    expect(screen.getByRole('textbox', { name: 'Username' }).id).not.toBe(email.id);
    await user.click(screen.getByText('Email'));
    expect(email).toHaveFocus();
    rerender(
      <>
        <p id="email-help">Work address</p>
        <Input id="email" label="Email" aria-describedby="email-help" />
        <Input label="Username" />
      </>,
    );
    expect(email).not.toHaveAttribute('aria-invalid');
    expect(email).toHaveAccessibleDescription('Work address');
  });

  it('shows a tooltip on focus, preserves existing descriptions and dismisses with Escape', async () => {
    const user = userEvent.setup();
    render(
      <>
        <p id="hint">Existing hint</p>
        <Tooltip label="Extra detail">
          <button aria-describedby="hint">Details</button>
        </Tooltip>
      </>,
    );
    await user.tab();
    const trigger = screen.getByRole('button', { name: 'Details' });
    const tooltip = screen.getByRole('tooltip');
    expect(trigger).toHaveAccessibleDescription('Existing hint Extra detail');
    expect(trigger.getAttribute('aria-describedby')?.split(' ')).toContain(tooltip.id);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-describedby', 'hint');
    expect(trigger).toHaveFocus();
  });

  it('names a dialog, traps focus in both directions and returns focus on close', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open dialog</button>
          <button>Outside</button>
          {open && (
            <Modal onClose={() => setOpen(false)} exitDurationMs={0}>
              {(close) => (
                <>
                  <h2>Preferences</h2>
                  <button>First</button>
                  <button onClick={close}>Last</button>
                </>
              )}
            </Modal>
          )}
        </>
      );
    }
    const overflow = document.body.style.overflow;
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: 'Preferences' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    act(() => screen.getByRole('button', { name: 'Outside' }).focus());
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe(overflow);
  });

  it('keeps caller-owned dialog semantics and existing heading IDs', () => {
    render(
      <Modal onClose={vi.fn()}>
        {() => (
          <section role="dialog" aria-labelledby="existing-title">
            <h2 id="existing-title">Existing title</h2>
          </section>
        )}
      </Modal>,
    );
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Existing title' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    expect(screen.getByRole('heading')).toHaveAttribute('id', 'existing-title');
  });

  it('preserves React autoFocus after an earlier close button and returns focus to the opener', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open account form</button>
          {open && (
            <Modal onClose={() => setOpen(false)} exitDurationMs={0}>
              {(close) => (
                <>
                  <h2>Account form</h2>
                  <button onClick={close}>Close form</button>
                  <Input label="Username" autoFocus />
                </>
              )}
            </Modal>
          )}
        </>
      );
    }
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Open account form' });
    await user.click(opener);
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('skips hidden, disabled and negative-tabindex controls when trapping dialog focus', async () => {
    const user = userEvent.setup();
    render(
      <Modal onClose={vi.fn()}>
        {() => (
          <>
            <h2>Focus choices</h2>
            <div hidden>
              <button>Hidden</button>
            </div>
            <button disabled>Disabled</button>
            <button tabIndex={-1}>Arrow only</button>
            <button>Reachable</button>
          </>
        )}
      </Modal>,
    );
    const reachable = screen.getByRole('button', { name: 'Reachable' });
    expect(reachable).toHaveFocus();
    await user.tab({ shift: true });
    expect(reachable).toHaveFocus();
    await user.tab();
    expect(reachable).toHaveFocus();
  });

  it('lets users hover the tooltip content before dismissing it', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Hoverable detail">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    await user.hover(trigger);
    const tooltip = screen.getByRole('tooltip');
    await user.unhover(trigger);
    await user.hover(tooltip);
    expect(tooltip).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes only the top nested dialog and restores its parent focus and scroll lock', async () => {
    const user = userEvent.setup();
    const closeParent = vi.fn();
    function Example() {
      const [nested, setNested] = useState(false);
      return (
        <Modal onClose={closeParent} exitDurationMs={0}>
          {() => (
            <>
              <h2>Parent</h2>
              <button onClick={() => setNested(true)}>Open child</button>
              {nested && (
                <Modal onClose={() => setNested(false)} exitDurationMs={0}>
                  {() => (
                    <>
                      <h2>Child</h2>
                      <button>Earlier child action</button>
                      <Input label="Child entry" autoFocus />
                    </>
                  )}
                </Modal>
              )}
            </>
          )}
        </Modal>
      );
    }
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Open child' }));
    expect(screen.getByRole('textbox', { name: 'Child entry' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Child' })).not.toBeInTheDocument(),
    );
    expect(closeParent).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open child' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(closeParent).toHaveBeenCalledTimes(1));
  });

  it('focuses menu items, wraps navigation, opens a submenu and returns focus on Escape', async () => {
    const user = userEvent.setup();
    const selected = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open menu</button>
          {open && (
            <DropdownMenu
              onClose={() => setOpen(false)}
              items={[
                { key: 'edit', label: 'Edit' },
                {
                  key: 'more',
                  label: 'More',
                  submenuItems: [
                    { key: 'one', label: 'One' },
                    { key: 'two', label: 'Two', checked: true, onClick: selected },
                  ],
                },
              ]}
            />
          )}
        </>
      );
    }
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Open menu' });
    await user.click(opener);
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    const more = screen.getByRole('menuitem', { name: 'More' });
    expect(more).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus();
    expect(document.getElementById(more.getAttribute('aria-controls') ?? '')).toHaveAttribute(
      'role',
      'menu',
    );
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Two' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menuitem', { name: 'One' })).not.toBeInTheDocument();
    expect(more).toHaveFocus();
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).not.toHaveAttribute('aria-controls');
    await user.keyboard('{ArrowRight}{End}{Enter}');
    expect(selected).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('allows a portaled menu inside a modal without escaping the dialog or closing its parent', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();
    function Example() {
      const [menu, setMenu] = useState(false);
      return (
        <Modal onClose={closeModal}>
          {() => (
            <>
              <h2>Dialog menu</h2>
              <button onClick={() => setMenu(true)}>Actions</button>
              {menu && (
                <DropdownMenu
                  onClose={() => setMenu(false)}
                  items={[{ key: 'edit', label: 'Edit' }]}
                />
              )}
            </>
          )}
        </Modal>
      );
    }
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
  });

  it('uses one tab stop and arrow key selection for radios', async () => {
    const user = userEvent.setup();
    function Example() {
      const [value, setValue] = useState('one');
      return (
        <RadioGroup
          aria-label="Choice"
          value={value}
          onChange={setValue}
          options={[
            { value: 'one', label: 'One', description: 'First choice' },
            { value: 'two', label: 'Two' },
          ]}
        />
      );
    }
    render(<Example />);
    expect(screen.getByRole('radiogroup', { name: 'Choice' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'One' })).toHaveAccessibleDescription('First choice');
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Two' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Two' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'One' })).toHaveAttribute('tabindex', '-1');
  });

  it('connects a real tab panel and selects visible tabs with arrows, Home and End', async () => {
    const user = userEvent.setup();
    function Example() {
      const [active, setActive] = useState<ProfileTabType>('posts');
      return (
        <>
          <ProfileTabs
            idPrefix="test-tab"
            panelId="test-panel"
            activeTab={active}
            setActiveTab={setActive}
          />
          <div id="test-panel" role="tabpanel" aria-labelledby={`test-tab-${active}`}>
            {active}
          </div>
        </>
      );
    }
    render(<Example />);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Reels' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Reels' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Reels' })).toHaveTextContent('reels');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Posts' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Reels' })).toHaveFocus();
    expect(screen.queryByRole('tab', { name: 'Saved' })).not.toBeInTheDocument();
    expect(
      document.getElementById(
        screen.getByRole('tab', { name: 'Reels' }).getAttribute('aria-controls') ?? '',
      ),
    ).toHaveAttribute('role', 'tabpanel');
  });

  it('does not emit a controls reference when no tab panel was supplied', () => {
    render(<ProfileTabs activeTab="posts" setActiveTab={vi.fn()} />);
    for (const tab of screen.getAllByRole('tab')) expect(tab).not.toHaveAttribute('aria-controls');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Posts' }), { key: 'ArrowRight' });
  });
});
