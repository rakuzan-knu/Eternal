import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { PollCreator } from './PollCreator';
import { PollOptionDraft } from '../model/types';

function PollCreatorWrapper(props: { initialOptions?: PollOptionDraft[] }) {
  const [options, setOptions] = useState<PollOptionDraft[]>(
    props.initialOptions ?? [
      { id: '1', text: 'TypeScript' },
      { id: '2', text: 'Rust' },
    ],
  );

  return (
    <div className="w-[420px] max-w-full">
      <PollCreator
        isOpen={true}
        options={options}
        onChange={setOptions}
        onClose={() => console.log('Close poll creator')}
      />
    </div>
  );
}

const meta: Meta<typeof PollCreator> = {
  title: 'Features/Posts/PollCreator',
  component: PollCreator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PollCreator>;

export const TwoOptions: Story = {
  render: () => <PollCreatorWrapper />,
};

export const FourOptions: Story = {
  render: () => (
    <PollCreatorWrapper
      initialOptions={[
        { id: '1', text: 'PostgreSQL' },
        { id: '2', text: 'Redis' },
        { id: '3', text: 'ClickHouse' },
        { id: '4', text: 'MongoDB' },
      ]}
    />
  ),
};
