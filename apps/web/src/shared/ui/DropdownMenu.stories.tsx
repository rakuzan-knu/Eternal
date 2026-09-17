import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Settings, User, LogOut, Bell, Shield, Moon } from 'lucide-react';

import DropdownMenu, { DropdownMenuItem } from './DropdownMenu';

const defaultItems: DropdownMenuItem[] = [
  { key: 'profile', label: 'View Profile', icon: <User size={16} />, onClick: () => {} },
  {
    key: 'settings',
    label: 'Settings',
    icon: <Settings size={16} />,
    badge: 'New',
    onClick: () => {},
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: <Bell size={16} />,
    badge: 3,
    onClick: () => {},
  },
  {
    key: 'theme',
    label: 'Appearance',
    icon: <Moon size={16} />,
    hasSubmenu: true,
    submenuItems: [
      { key: 'dark', label: 'Dark Mode', checked: true, onClick: () => {} },
      { key: 'light', label: 'Light Mode', onClick: () => {} },
      { key: 'system', label: 'System Default', onClick: () => {} },
    ],
  },
  {
    key: 'privacy',
    label: 'Privacy & Safety',
    icon: <Shield size={16} />,
    hasSubmenu: true,
    submenuItems: [
      { key: 'blocked', label: 'Blocked Accounts', onClick: () => {} },
      { key: 'muted', label: 'Muted Accounts', onClick: () => {} },
    ],
  },
  { key: 'divider-1', label: '', divider: true },
  { key: 'logout', label: 'Log Out', icon: <LogOut size={16} />, danger: true, onClick: () => {} },
];

function DropdownWrapper(props: { items: DropdownMenuItem[]; align?: 'left' | 'right' }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-20 flex justify-center">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition cursor-pointer"
        >
          {isOpen ? 'Close Menu' : 'Open Menu'}
        </button>
        {isOpen && (
          <DropdownMenu
            items={props.items}
            onClose={() => setIsOpen(false)}
            align={props.align ?? 'left'}
          />
        )}
      </div>
    </div>
  );
}

const meta: Meta<typeof DropdownMenu> = {
  title: 'Shared/UI/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => <DropdownWrapper items={defaultItems} />,
};

export const RightAligned: Story = {
  render: () => <DropdownWrapper items={defaultItems} align="right" />,
};

export const SimpleList: Story = {
  render: () => (
    <DropdownWrapper
      items={[
        { key: 'copy', label: 'Copy Link', onClick: () => {} },
        { key: 'share', label: 'Share Post', onClick: () => {} },
        { key: 'divider', label: '', divider: true },
        { key: 'report', label: 'Report Post', danger: true, onClick: () => {} },
      ]}
    />
  ),
};
