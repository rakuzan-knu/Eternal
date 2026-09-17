import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import Toggle from './Toggle';

function ToggleWrapper(props: { initial?: boolean; disabled?: boolean }) {
  const [checked, setChecked] = useState(props.initial ?? false);

  return (
    <div className="flex items-center gap-3">
      <Toggle
        checked={checked}
        onChange={() => setChecked((v) => !v)}
        disabled={props.disabled}
        aria-label="Demo toggle"
      />
      <span className="text-sm font-medium text-neutral-300">
        {checked ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );
}

const meta: Meta<typeof Toggle> = {
  title: 'Shared/UI/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Checked: Story = {
  render: () => <ToggleWrapper initial={true} />,
};

export const Unchecked: Story = {
  render: () => <ToggleWrapper initial={false} />,
};

export const Disabled: Story = {
  render: () => <ToggleWrapper initial={true} disabled={true} />,
};
