import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import RadioGroup, { RadioOption } from './RadioGroup';

type SamplePeriod = 'EVERYONE' | 'FRIENDS' | 'NOBODY';

const options: RadioOption<SamplePeriod>[] = [
  { value: 'EVERYONE', label: 'Everyone', description: 'Anyone on the platform can see this.' },
  {
    value: 'FRIENDS',
    label: 'Friends Only',
    description: 'Only people you follow and follow you back.',
  },
  { value: 'NOBODY', label: 'Nobody', description: 'Keep this private and hidden from everyone.' },
];

function RadioGroupWrapper() {
  const [value, setValue] = useState<SamplePeriod>('EVERYONE');

  return (
    <div className="w-[380px] max-w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
      <RadioGroup value={value} options={options} onChange={setValue} />
    </div>
  );
}

const meta: Meta<typeof RadioGroup> = {
  title: 'Shared/UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => <RadioGroupWrapper />,
};
