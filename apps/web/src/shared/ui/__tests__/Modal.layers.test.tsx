import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from '../Modal';
import DropdownMenu from '../DropdownMenu';

describe('portaled overlay layers', () => {
  it('keeps a settings child dialog and its action menu above a legacy parent', async () => {
    const user = userEvent.setup();
    function Settings() {
      const [open, setOpen] = useState(false);
      const [menuOpen, setMenuOpen] = useState(false);
      return (
        <div style={{ position: 'fixed', zIndex: 9999 }}>
          <button onClick={() => setOpen(true)}>Open settings child</button>
          {open && (
            <Modal onClose={() => setOpen(false)} aria-label="Settings child">
              {() => (
                <>
                  <button onClick={() => setMenuOpen(true)}>Child actions</button>
                  {menuOpen && (
                    <DropdownMenu
                      items={[{ key: 'save', label: 'Save', onClick: vi.fn() }]}
                      onClose={() => setMenuOpen(false)}
                    />
                  )}
                </>
              )}
            </Modal>
          )}
        </div>
      );
    }
    render(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Open settings child' }));
    const dialog = screen.getByRole('dialog', { name: 'Settings child' });
    const dialogLayer = Number(getComputedStyle(dialog.parentElement!).zIndex);
    expect(dialogLayer).toBeGreaterThan(9999);
    await user.click(screen.getByRole('button', { name: 'Child actions' }));
    const menu = await screen.findByRole('menu', { name: 'Actions' });
    expect(Number(getComputedStyle(menu).zIndex)).toBeGreaterThan(dialogLayer);
    expect(screen.getByRole('menuitem', { name: 'Save' })).toHaveFocus();
  });
});
