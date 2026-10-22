import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type {
  CommunityChannelAccessDto,
  CommunityChannelDto,
} from '@social-network/shared-contracts';
import { communitiesApi, communityKeys, useCommunityAction } from '@/features/communities';
import Modal from '@/shared/ui/Modal';
import { communityButton } from './communityStyles';
import { CommunityChannelMemberPicker } from './CommunityChannelMemberPicker';

export function CommunityChannelAccessDialog({
  channel,
  onClose,
  onSaved,
}: {
  channel: CommunityChannelDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const title = useId();
  const [verified, setVerified] = useState(false);
  const access = useQuery({
    queryKey: [...communityKeys.channels(channel.communityId), 'access', channel.id],
    queryFn: ({ signal }) => communitiesApi.channelAccess(channel.communityId, channel.id, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
  useEffect(() => {
    if (access.isSuccess && !access.isFetching) setVerified(true);
  }, [access.isSuccess, access.isFetching]);
  if (access.isSuccess && (verified || !access.isFetching))
    return (
      <AccessEditor channel={channel} initial={access.data} onClose={onClose} onSaved={onSaved} />
    );
  return (
    <Modal onClose={onClose} aria-labelledby={title}>
      {() => (
        <div className="community-layout-dialog">
          <h2 id={title} className="text-xl font-bold">
            Channel access
          </h2>
          {access.isError ? (
            <div role="alert">
              Channel access could not be loaded. You may no longer have permission.
              <button
                type="button"
                className={communityButton}
                onClick={() => void access.refetch()}
              >
                Try again
              </button>
            </div>
          ) : (
            <p role="status">Loading channel access…</p>
          )}
          <button type="button" className={communityButton} onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}

function AccessEditor({
  channel,
  initial,
  onClose,
  onSaved,
}: {
  channel: CommunityChannelDto;
  initial: CommunityChannelAccessDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const title = useId();
  const [baseline] = useState(initial);
  const [isPrivate, setPrivate] = useState(initial.isPrivate);
  const [memberIds, setMemberIds] = useState(initial.memberIds);
  const [discard, setDiscard] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const dirty =
    isPrivate !== baseline.isPrivate ||
    JSON.stringify([...memberIds].sort()) !== JSON.stringify([...baseline.memberIds].sort());
  const mutation = useCommunityAction(() =>
    communitiesApi.setChannelAccess(channel.communityId, channel.id, {
      isPrivate,
      memberIds: isPrivate ? memberIds : [],
      revision: baseline.revision,
    }),
  );
  const conflict = axios.isAxiosError(mutation.error) && mutation.error.response?.status === 409;
  const close = () => {
    if (!mutation.isPending) {
      if (dirty) setDiscard(true);
      else onClose();
    }
  };
  return (
    <Modal
      onClose={close}
      onBeforeClose={() => {
        if (dirty) {
          setDiscard(true);
          return false;
        }
        return true;
      }}
      aria-labelledby={title}
      closeOnInputEscape
      dismissible={!mutation.isPending}
    >
      {() => (
        <div className="community-layout-dialog">
          <h2 id={title} className="text-xl font-bold">
            Access to #{channel.name}
          </h2>
          {discard ? (
            <>
              <p>Discard unsaved access changes?</p>
              <div className="flex justify-end gap-3">
                <button
                  autoFocus
                  type="button"
                  className={communityButton}
                  onClick={() => setDiscard(false)}
                >
                  Keep editing
                </button>
                <button type="button" className={communityButton} onClick={onClose}>
                  Discard changes
                </button>
              </div>
            </>
          ) : confirm ? (
            <>
              <p>
                {isPrivate
                  ? `Only owners, admins and ${memberIds.length} selected members will have access. Other members will lose access to this channel and its history.`
                  : 'Every active community member will gain access to this channel and its history.'}
              </p>
              {mutation.isError && (
                <p role="alert">
                  {conflict
                    ? 'Channel access changed while you were editing. Your draft is kept. Close and reopen channel management to load the latest access.'
                    : 'Could not save access. Your draft is kept; try again.'}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  autoFocus
                  type="button"
                  disabled={mutation.isPending}
                  className={communityButton}
                  onClick={() => setConfirm(false)}
                >
                  Back to editing
                </button>
                <button
                  type="button"
                  className={communityButton}
                  disabled={mutation.isPending || conflict}
                  aria-busy={mutation.isPending}
                  onClick={() => mutation.mutate(undefined, { onSuccess: onSaved })}
                >
                  {mutation.isPending ? 'Saving…' : 'Apply access changes'}
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(event) => setPrivate(event.target.checked)}
                  className="size-4 accent-purple-600"
                />
                Private channel
              </label>
              <p className="text-sm">
                {isPrivate
                  ? 'Only owners, admins and selected members can read and participate.'
                  : 'Every active community member can read and participate.'}
              </p>
              {isPrivate && (
                <CommunityChannelMemberPicker
                  communityId={channel.communityId}
                  memberIds={memberIds}
                  onChange={setMemberIds}
                />
              )}
              <div className="flex justify-end gap-3">
                <button type="button" className={communityButton} onClick={close}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${communityButton} bg-purple-600 text-white`}
                  disabled={!dirty || conflict}
                  onClick={() => setConfirm(true)}
                >
                  Review access changes
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
