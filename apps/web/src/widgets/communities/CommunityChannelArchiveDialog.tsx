import { useId } from 'react';
import { communitiesApi, useCommunityAction } from '@/features/communities';
import type { CommunityChannelDto } from '@social-network/shared-contracts';
import Modal from '@/shared/ui/Modal';
import { communityButton } from './communityStyles';

export function CommunityChannelArchiveDialog({
  channel,
  revision,
  onClose,
  onSaved,
}: {
  channel: CommunityChannelDto;
  revision: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const title = useId();
  const archived = Boolean(channel.archivedAt);
  const mutation = useCommunityAction(() =>
    communitiesApi.setChannelArchived(channel.communityId, channel.id, {
      archived: !archived,
      revision,
    }),
  );
  return (
    <Modal onClose={onClose} aria-labelledby={title} dismissible={!mutation.isPending}>
      {() => (
        <div className="community-layout-dialog">
          <h2 id={title} className="text-xl font-bold">
            {archived ? 'Restore' : 'Archive'} #{channel.name}?
          </h2>
          <p>
            {archived
              ? 'Members will be able to post and start calls again. History and existing unread messages stay available.'
              : 'Members can still read and search history. Posting, editing, new reactions, pins and new calls stop until you restore the channel. End any active call first. Existing unread messages stay available.'}
          </p>
          <p>
            Messages and membership are kept. Existing deletion and moderation actions remain
            available.
          </p>
          {mutation.isError && (
            <p role="alert">
              Could not change this channel. It may have changed or still have an active call. Close
              this dialog, refresh the community and try again.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              autoFocus
              type="button"
              className={communityButton}
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={communityButton}
              aria-busy={mutation.isPending}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(undefined, { onSuccess: onSaved })}
            >
              {mutation.isPending ? 'Saving…' : archived ? 'Restore channel' : 'Archive channel'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
