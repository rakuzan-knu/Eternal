import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Bell, Inbox, MoreHorizontal, Settings, Shield, User } from 'lucide-react';
import { designTokens } from '@social-network/shared-ui-primitives';
import { Button } from './Button';
import { Input } from './Input';
import { GlassCard } from './GlassCard';
import Avatar from './Avatar';
import EmptyState from './EmptyState';
import SkeletonBone from './SkeletonBone';
import Toggle from './Toggle';
import RadioGroup from './RadioGroup';
import ProfileTabs, { type ProfileTabType } from './ProfileTabs';
import Modal from './Modal';
import Tooltip from './Tooltip';
import DropdownMenu from './DropdownMenu';

type ReferenceState = 'controls' | 'pending' | 'empty' | 'failure';

function DesignReference({ state = 'controls' }: { state?: ReferenceState }) {
  const [notifications, setNotifications] = useState(true);
  const [audience, setAudience] = useState('friends');
  const [tab, setTab] = useState<ProfileTabType>('posts');
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const [feedback, setFeedback] = useState('');
  return (
    <main className="min-h-screen w-full bg-[#070709] text-white p-4 sm:p-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name="Олександра — long display name" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold break-words">Eternal component reference</h1>
              <p className="text-sm text-neutral-400">Keyboard, touch and text-size review</p>
            </div>
          </div>
          <div className="relative">
            <Tooltip label="More actions" position="bottom">
              <button
                type="button"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
                className="rounded-xl bg-white/10 p-3"
              >
                <MoreHorizontal size={20} />
              </button>
            </Tooltip>
            {menu && (
              <DropdownMenu
                onClose={() => setMenu(false)}
                items={[
                  {
                    key: 'profile',
                    label: 'View profile',
                    icon: <User size={16} />,
                    onClick: () => setFeedback('Profile selected'),
                  },
                  {
                    key: 'appearance',
                    label: 'Appearance',
                    icon: <Settings size={16} />,
                    hasSubmenu: true,
                    submenuItems: [
                      {
                        key: 'dark',
                        label: 'Dark',
                        checked: true,
                        onClick: () => setFeedback('Dark appearance selected'),
                      },
                    ],
                  },
                  {
                    key: 'delete',
                    label: 'Delete draft',
                    danger: true,
                    onClick: () => setDialog(true),
                  },
                ]}
              />
            )}
          </div>
        </header>
        {state === 'pending' ? (
          <GlassCard aria-label="Loading content" aria-busy="true">
            <p role="status" className="text-sm text-neutral-300 mb-4">
              Loading your feed…
            </p>
            <div aria-hidden="true" className="space-y-3">
              <SkeletonBone className="h-8 w-2/3" />
              <SkeletonBone className="h-4 w-full" />
              <SkeletonBone className="h-4 w-4/5" />
            </div>
            <Button loading className="mt-6">
              Saving
            </Button>
          </GlassCard>
        ) : state === 'empty' ? (
          <GlassCard>
            <EmptyState
              icon={<Inbox size={28} />}
              title="No posts yet"
              subtitle="Posts shared by people you follow will appear here."
            />
            <Button onClick={() => setFeedback('People search opened')}>Find people</Button>
          </GlassCard>
        ) : state === 'failure' ? (
          <GlassCard>
            <div role="alert" className="space-y-3 mb-6">
              <h2 className="text-lg font-semibold">Your feed could not load</h2>
              <p className="text-sm text-neutral-300">
                Check your connection and try again. Your draft is saved.
              </p>
            </div>
            <Button onClick={() => setFeedback('Retry requested')}>Retry</Button>
          </GlassCard>
        ) : (
          <>
            <GlassCard className="!p-4 sm:!p-8 space-y-5">
              <h2 className="text-lg font-bold">Controls and validation</h2>
              <Input
                label="Display name"
                defaultValue="Олександра — a deliberately long display name"
              />
              <Input
                label="Email"
                defaultValue="invalid-email"
                error="Enter a valid email address to continue."
              />
              <Input label="Account ID" defaultValue="eternal-123" disabled />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={() => setDialog(true)}>Review changes</Button>
                <Button variant="secondary" disabled>
                  Unavailable action
                </Button>
              </div>
            </GlassCard>
            <GlassCard className="!p-4 sm:!p-8 space-y-5">
              <h2 className="text-lg font-bold">Preferences</h2>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-sm">
                  <Bell size={18} /> Notifications
                </span>
                <Toggle
                  aria-label="Notifications"
                  checked={notifications}
                  onChange={() => setNotifications(!notifications)}
                />
              </div>
              <p className="text-sm text-neutral-300">Post audience</p>
              <RadioGroup
                aria-label="Post audience"
                value={audience}
                onChange={setAudience}
                options={[
                  {
                    value: 'everyone',
                    label: 'Everyone',
                    description: 'Anyone can see your posts.',
                  },
                  {
                    value: 'friends',
                    label: 'Friends',
                    description: 'People you follow who also follow you.',
                  },
                  { value: 'private', label: 'Only me', description: 'Keep this content private.' },
                ]}
              />
            </GlassCard>
            <GlassCard className="!p-0 overflow-hidden">
              <ProfileTabs
                activeTab={tab}
                setActiveTab={setTab}
                showSavedTab
                idPrefix="reference-tabs"
                panelId="reference-panel"
              />
              <div
                className="p-6"
                id="reference-panel"
                role="tabpanel"
                aria-labelledby={`reference-tabs-${tab}`}
                tabIndex={0}
              >
                <p className="text-sm text-neutral-300">Selected view: {tab}</p>
              </div>
            </GlassCard>
          </>
        )}
        <p role="status" className="text-sm text-purple-300 min-h-5">
          {feedback}
        </p>
      </div>
      {dialog && (
        <Modal onClose={() => setDialog(false)}>
          {(requestClose) => (
            <GlassCard className="w-[min(440px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto text-white space-y-5">
              <Shield size={28} className="text-purple-400" />
              <h2 className="text-xl font-bold">Review your changes</h2>
              <p className="text-sm text-neutral-300">
                Confirm the changes to your profile. You can return to editing without losing your
                draft.
              </p>
              <Input label="Confirmation note" placeholder="Optional note" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="secondary" onClick={requestClose}>
                  Keep editing
                </Button>
                <Button
                  onClick={() => {
                    setFeedback('Changes confirmed');
                    requestClose();
                  }}
                >
                  Confirm
                </Button>
              </div>
            </GlassCard>
          )}
        </Modal>
      )}
    </main>
  );
}

const meta: Meta<typeof DesignReference> = {
  id: 'design-reference',
  title: 'Design/Reference',
  component: DesignReference,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DesignReference>;

export const Controls: Story = { args: { state: 'controls' } };
export const Pending: Story = { args: { state: 'pending' } };
export const Empty: Story = { args: { state: 'empty' } };
export const Failure: Story = { args: { state: 'failure' } };
export const Narrow: Story = {
  args: { state: 'controls' },
  parameters: { viewport: { defaultViewport: 'narrow' } },
};
export const LargeText: Story = { args: { state: 'controls' }, globals: { textScale: 2 } };
export const Tokens: Story = {
  render: () => (
    <main className="min-h-screen bg-[#070709] text-white p-6 space-y-6">
      <h1 className="text-2xl font-bold">Shared foundations</h1>
      <section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-label="Brand colors"
      >
        {Object.entries(designTokens.brand).map(([name, color]) => (
          <div key={name} className="rounded-2xl overflow-hidden border border-white/10">
            <div style={{ backgroundColor: color }} className="h-24" />
            <div className="p-4">
              <h2 className="font-semibold">{name}</h2>
              <code className="text-sm text-neutral-300">{color}</code>
            </div>
          </div>
        ))}
      </section>
      <p className="text-neutral-300">
        Spacing and radii share numeric logical units at a 16px root. Content themes remain
        feature-specific.
      </p>
    </main>
  ),
};
