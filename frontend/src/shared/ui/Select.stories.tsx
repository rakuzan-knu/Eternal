import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Select } from './Select';

const sampleOptions = ['Technology', 'Design', 'Science', 'Gaming', 'Music', 'Cinema', 'Travel'];

function SelectWrapper() {
  const [val, setVal] = useState(sampleOptions[0]);

  return (
    <div className="w-[300px] max-w-full p-6">
      <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        Select Topic
      </label>
      <Select value={val} onChange={setVal} options={sampleOptions} />
    </div>
  );
}

const meta: Meta<typeof Select> = {
  title: 'Shared/UI/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => <SelectWrapper />,
};
