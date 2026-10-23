import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  notificationModeSchema,
  type CommunityChannelDto,
  type CommunityNotificationPreferences,
  type CommunityChannelNotificationPreferences,
} from '@social-network/shared-contracts';
import { communitiesApi, communityKeys, useCommunityAction } from '@/features/communities';
import Modal from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { useLocale } from '@/shared/lib/language/locale';
import { communityButton } from './communityStyles';

const modes = [
  { value: 'ALL', label: 'All messages' },
  { value: 'MENTIONS', label: 'Only personal mentions' },
  { value: 'NONE', label: 'No message alerts' },
];

export function CommunityNotificationDialog({
  communityId,
  channels,
  selectedChannelId,
  onClose,
}: {
  communityId: string;
  channels: CommunityChannelDto[];
  selectedChannelId?: string;
  onClose: () => void;
}) {
  const title = useId();
  const [scope, setScope] = useState(selectedChannelId ?? 'server');
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [nextScope, setNextScope] = useState<string | null>(null);
  const channelId = scope === 'server' ? undefined : scope;
  const preferences = useQuery({
    queryKey: communityKeys.notificationPreferences(communityId, channelId),
    queryFn: async ({ signal }) =>
      channelId
        ? communitiesApi.channelNotificationPreferences(communityId, channelId, signal)
        : communitiesApi.notificationPreferences(communityId, signal),
    staleTime: 0,
    retry: false,
  });
  const close = () => {
    if (pending) return;
    if (dirty) {
      setNextScope(null);
      setDiscard(true);
    } else onClose();
  };
  return (
    <Modal
      onClose={onClose}
      onBeforeClose={() => {
        if (dirty) {
          setNextScope(null);
          setDiscard(true);
          return false;
        }
        return true;
      }}
      aria-labelledby={title}
      dismissible={!pending && !discard}
      closeOnInputEscape
    >
      {() => (
        <div className="community-layout-dialog">
          <h2 id={title} className="text-xl font-bold">
            Notification settings
          </h2>
          {discard && (
            <>
              <p>Discard your unsaved notification changes?</p>
              <div className="flex justify-end gap-3">
                <button
                  autoFocus
                  type="button"
                  className={communityButton}
                  onClick={() => setDiscard(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className={communityButton}
                  onClick={() => {
                    if (nextScope === null) onClose();
                    else {
                      setDirty(false);
                      setScope(nextScope);
                      setDiscard(false);
                    }
                  }}
                >
                  Discard changes
                </button>
              </div>
            </>
          )}
          <div hidden={discard}>
            <Select
              aria-label="Notification settings for"
              value={scope}
              disabled={pending}
              options={[
                { value: 'server', label: 'This server' },
                ...channels.map((channel) => ({ value: channel.id, label: `#${channel.name}` })),
              ]}
              onChange={(value) => {
                if (dirty) {
                  setNextScope(value);
                  setDiscard(true);
                } else setScope(value);
              }}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              These preferences apply to your account. Message history and unread counts stay
              available.
            </p>
            {preferences.isPending ? (
              <p role="status">Loading notification settings…</p>
            ) : preferences.isError ? (
              <div role="alert">
                <p>
                  Could not load notification settings. Check your connection and access, then try
                  again.
                </p>
                <button
                  type="button"
                  className={communityButton}
                  onClick={() => void preferences.refetch()}
                >
                  Try again
                </button>
                <button type="button" className={communityButton} onClick={close}>
                  Close
                </button>
              </div>
            ) : (
              <NotificationForm
                key={scope}
                communityId={communityId}
                channelId={channelId}
                data={preferences.data}
                onDirty={setDirty}
                onPending={setPending}
                onClose={close}
                onSaved={onClose}
              />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function NotificationForm({
  communityId,
  channelId,
  data,
  onDirty,
  onPending,
  onClose,
  onSaved,
}: {
  communityId: string;
  channelId?: string;
  data: CommunityNotificationPreferences | CommunityChannelNotificationPreferences;
  onDirty: (dirty: boolean) => void;
  onPending: (pending: boolean) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [initial] = useState(data);
  const [mode, setMode] = useState(initial.notificationMode ?? 'INHERIT');
  const [mute, setMute] = useState('keep');
  const locale = useLocale();
  const mutation = useCommunityAction(async () => {
    if (channelId)
      return communitiesApi.setChannelNotificationPreferences(communityId, channelId, {
        notificationMode: mode === 'INHERIT' ? null : notificationModeSchema.parse(mode),
      });
    const notificationMutedUntil =
      mute === 'keep'
        ? initial.notificationMutedUntil
        : mute === 'off'
          ? null
          : new Date(Date.now() + Number(mute) * 60_000).toISOString();
    return communitiesApi.setNotificationPreferences(communityId, {
      ...(mode !== initial.notificationMode
        ? { notificationMode: notificationModeSchema.parse(mode) }
        : {}),
      ...(mute !== 'keep' ? { notificationMutedUntil } : {}),
    });
  });
  const dirty = mode !== (initial.notificationMode ?? 'INHERIT') || mute !== 'keep';
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => onPending(mutation.isPending), [mutation.isPending, onPending]);
  const serverMuteActive = Boolean(
    data.notificationMutedUntil && Date.parse(data.notificationMutedUntil) > Date.now(),
  );
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!mutation.isPending && dirty) mutation.mutate(undefined, { onSuccess: onSaved });
      }}
    >
      <Select
        aria-label="Message alerts"
        value={mode}
        onChange={setMode}
        disabled={mutation.isPending}
        options={channelId ? [{ value: 'INHERIT', label: 'Use server default' }, ...modes] : modes}
      />
      {channelId ? (
        <p className="text-sm">
          Use server default follows your server preference. A server mute or an existing chat mute
          also silences this channel.
        </p>
      ) : (
        <Select
          aria-label="Mute server"
          value={mute}
          onChange={setMute}
          disabled={mutation.isPending}
          options={[
            { value: 'keep', label: serverMuteActive ? 'Keep current mute' : 'Not muted' },
            { value: 'off', label: 'Unmute server' },
            { value: '15', label: 'Mute for 15 minutes' },
            { value: '60', label: 'Mute for 1 hour' },
            { value: '480', label: 'Mute for 8 hours' },
            { value: '1440', label: 'Mute for 24 hours' },
          ]}
        />
      )}
      {serverMuteActive && data.notificationMutedUntil && (
        <p role="status">
          Server muted until {new Date(data.notificationMutedUntil).toLocaleString(locale)}.
        </p>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Personal mentions use @username. Global notification, sound and Do Not Disturb settings
        still apply. Calls keep their existing mute controls.
      </p>
      {mutation.isError && (
        <p role="alert">
          Could not save notification settings. Your changes are kept; check your connection and
          access, then try again.
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          className={communityButton}
          disabled={mutation.isPending}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={communityButton}
          aria-busy={mutation.isPending}
          disabled={mutation.isPending || !dirty}
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
