import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { CommentComposer } from './CommentComposer';

function CommentComposerStoryWrapper({ hasReply = false }: { hasReply?: boolean }) {
  const [replyingTo, setReplyingTo] = useState(
    hasReply ? { commentId: 'c1', username: 'elena', displayName: 'Elena Rostova' } : null,
  );

  return (
    <div className="w-[500px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
      <CommentComposer
        currentUserHandle="marcus"
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSubmit={(text, mediaUrl, parentId) => {
          console.log('Submitted comment:', text, mediaUrl, parentId);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof CommentComposer> = {
  title: 'Features/Comment/CommentComposer',
  component: CommentComposer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CommentComposer>;

export const Default: Story = {
  render: () => <CommentComposerStoryWrapper hasReply={false} />,
};

export const InReplyTo: Story = {
  render: () => <CommentComposerStoryWrapper hasReply={true} />,
};
