import { queryKeys } from '@/shared/api/queryKeys';
import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, X, Copy, Send, Share2, Shield, Users } from 'lucide-react';
import type { CommunitySummary, CreatedCommunityInvite } from '@social-network/shared-contracts';
import {
  createCommunitySchema,
  createCommunityChannelSchema,
} from '@social-network/shared-contracts';
import Modal from '@/shared/ui/Modal';
import Avatar from '@/shared/ui/Avatar';
import { Select } from '@/shared/ui/Select';
import { useDebounce } from '@/shared/lib/useDebounce';
import { apiClient } from '@/shared/api/httpClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { chatApi } from '@/entities/chat';
import { sendDirectMessage } from '@/features/chat';
import { useLocale } from '@/shared/lib/language/locale';
import {
  communitiesApi,
  useCommunityAction,
  useCommunityInvites,
  useCommunityMembers,
  useCommunityBans,
} from '@/features/communities';
import { CommunityChannelMemberPicker } from './CommunityChannelMemberPicker';
import { communityButton, communityInput } from './communityStyles';

const surface =
  'w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5 sm:p-7 shadow-2xl text-gray-900 dark:text-white space-y-5';

export function CommunityCreateDialog({
  communityId,
  community,
  onClose,
  onCreated,
}: {
  communityId?: string;
  community?: CommunitySummary;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const title = useId();
  const nameId = useId();
  const descriptionId = useId();
  const validationId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(community?.name ?? '');
  const [description, setDescription] = useState(community?.description ?? '');
  const [validation, setValidation] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [discard, setDiscard] = useState(false);
  const dirtyChannel = Boolean(
    communityId && (name || description || isPrivate || memberIds.length),
  );
  const mutation = useCommunityAction(async () => {
    if (community) {
      return (await communitiesApi.update(community.id, { name, description })).id;
    }
    if (communityId) {
      await communitiesApi.createChannel(communityId, {
        name,
        description,
        isPrivate,
        memberIds: isPrivate ? memberIds : [],
      });
      return communityId;
    }
    return (await communitiesApi.create({ name, description })).id;
  });
  const close = () => {
    if (!mutation.isPending) {
      if (dirtyChannel) setDiscard(true);
      else onClose();
    }
  };
  return (
    <Modal
      onClose={close}
      onBeforeClose={() => {
        if (dirtyChannel) {
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
        <form
          noValidate
          className={surface}
          onSubmit={(event) => {
            event.preventDefault();
            if (mutation.isPending || discard) return;
            const parsed = (
              communityId ? createCommunityChannelSchema : createCommunitySchema
            ).safeParse({
              name,
              description,
              ...(communityId ? { isPrivate, memberIds: isPrivate ? memberIds : [] } : {}),
            });
            if (!parsed.success) {
              setValidation(parsed.error.issues[0]?.message ?? 'Check the name and description.');
              nameRef.current?.focus();
              return;
            }
            setValidation('');
            mutation.mutate(undefined, { onSuccess: onCreated });
          }}
        >
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 id={title} className="text-xl font-bold">
                {community
                  ? 'Edit community'
                  : communityId
                    ? 'Create a channel'
                    : 'Create your community'}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {communityId
                  ? isPrivate
                    ? 'Only owners, admins and selected members can join.'
                    : 'All active community members can join the conversation.'
                  : 'A public home for your people. Membership is by invitation.'}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close creation"
              onClick={close}
              disabled={mutation.isPending}
              className={communityButton}
            >
              <X size={18} />
            </button>
          </div>
          {discard ? (
            <div className="space-y-3">
              <p>Discard this channel draft?</p>
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
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor={nameId} className="text-sm font-semibold">
                  Name
                </label>
                <input
                  id={nameId}
                  ref={nameRef}
                  autoFocus
                  disabled={mutation.isPending}
                  aria-invalid={Boolean(validation)}
                  aria-describedby={validation ? validationId : undefined}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  className={communityInput}
                  autoComplete="off"
                />
              </div>
              {communityId && (
                <fieldset disabled={mutation.isPending} className="space-y-3">
                  <legend className="text-sm font-semibold mb-2">Channel access</legend>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(event) => setPrivate(event.target.checked)}
                      className="size-4 accent-purple-600"
                    />
                    Private channel
                  </label>
                  {isPrivate && (
                    <CommunityChannelMemberPicker
                      communityId={communityId}
                      memberIds={memberIds}
                      onChange={setMemberIds}
                      disabled={mutation.isPending}
                    />
                  )}
                </fieldset>
              )}
              <div className="space-y-2">
                <label htmlFor={descriptionId} className="text-sm font-semibold">
                  Description <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  id={descriptionId}
                  disabled={mutation.isPending}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  className={`${communityInput} resize-none`}
                />
              </div>
              {(validation || mutation.isError) && (
                <p id={validationId} role="alert" className="text-sm text-red-500">
                  {validation || 'Could not create this. Your details are kept; try again.'}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={close}
                  className={communityButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  aria-busy={mutation.isPending}
                  className={`${communityButton} bg-purple-600 hover:bg-purple-500 text-white`}
                >
                  <Plus size={17} />
                  {mutation.isPending
                    ? 'Creating…'
                    : communityId
                      ? 'Create channel'
                      : community
                        ? 'Save changes'
                        : 'Create community'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

function InviteDirectShare({ url, name }: { url: string; name: string }) {
  const deliveryIds = useRef(new Map<string, string>());
  const [search, setSearch] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const query = useDebounce(search.trim(), 300);
  const userId = useAuthStore((state) => state.userId);
  const results = useQuery({
    queryKey: queryKeys.communities.people(query),
    enabled: query.length >= 2,
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<
          { id: string; username: string; displayName: string | null; avatar: string | null }[]
        >('/users/search', { params: { q: query }, signal })
      ).data,
  });
  const send = useCommunityAction(async (peerId: string) => {
    if (!userId) throw new Error('Sign in to send an invitation');
    const conversation = await chatApi.createDirectConversation(peerId);
    const deliveryKey = `${url}:${peerId}`;
    const deliveryId = deliveryIds.current.get(deliveryKey) ?? crypto.randomUUID();
    deliveryIds.current.set(deliveryKey, deliveryId);
    await sendDirectMessage(conversation.id, peerId, userId, `Join ${name}\n${url}`, deliveryId);
    return peerId;
  });
  return (
    <div className="space-y-3 pt-4 border-t border-black/10 dark:border-white/10">
      <label className="block text-sm font-semibold">
        Send in a direct message
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search username"
          className={`${communityInput} mt-2`}
        />
      </label>
      {query.length >= 2 && results.isPending && (
        <p role="status" className="text-sm text-gray-500">
          Finding people…
        </p>
      )}
      {results.isError && (
        <div role="alert" className="text-sm text-red-500">
          People could not be loaded.{' '}
          <button
            type="button"
            className="underline cursor-pointer"
            onClick={() => void results.refetch()}
          >
            Try again
          </button>
        </div>
      )}
      {query.length >= 2 && results.isSuccess && results.data.length === 0 && (
        <p className="text-sm text-gray-500">No people found. Try another username.</p>
      )}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {results.data
          ?.filter((person) => person.id !== userId)
          .map((person) => (
            <div key={person.id} className="flex items-center gap-3">
              <Avatar src={person.avatar} size="sm" />
              <span className="flex-1 min-w-0 truncate text-sm">
                {person.displayName || person.username}
              </span>
              <button
                type="button"
                disabled={send.isPending || sent.includes(person.id)}
                onClick={() =>
                  send.mutate(person.id, { onSuccess: (id) => setSent((old) => [...old, id]) })
                }
                className={communityButton}
              >
                <Send size={15} />
                {sent.includes(person.id)
                  ? 'Sent'
                  : send.isPending && send.variables === person.id
                    ? 'Sending…'
                    : 'Send'}
              </button>
            </div>
          ))}
      </div>
      {send.isError && (
        <p role="alert" className="text-sm text-red-500">
          Invitation was not sent. Choose the recipient again to retry.
        </p>
      )}
    </div>
  );
}

export function CommunityInviteDialog({
  community,
  onClose,
}: {
  community: CommunitySummary;
  onClose: () => void;
}) {
  const titleId = useId();
  const locale = useLocale();
  const [days, setDays] = useState('7');
  const [maxUses, setMaxUses] = useState('');
  const [created, setCreated] = useState<CreatedCommunityInvite | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [inviteCursors, setInviteCursors] = useState<(string | undefined)[]>([undefined]);
  const invites = useCommunityInvites(community.id, true, inviteCursors[inviteCursors.length - 1]);
  const create = useCommunityAction(async () =>
    communitiesApi.invite(community.id, {
      expiresInDays: Number(days),
      ...(maxUses ? { maxUses: Number(maxUses) } : {}),
    }),
  );
  const revoke = useCommunityAction((inviteId: string) =>
    communitiesApi.revoke(community.id, inviteId),
  );
  const url = created
    ? `${window.location.origin}/invite/${encodeURIComponent(created.token)}`
    : '';
  const close = () => {
    if (!create.isPending && !revoke.isPending) onClose();
  };
  return (
    <Modal
      onClose={close}
      aria-labelledby={titleId}
      dismissible={!create.isPending && !revoke.isPending}
    >
      {() => (
        <div className={surface}>
          <div className="flex justify-between gap-4 items-start">
            <div>
              <h2 id={titleId} className="text-xl font-bold">
                Invite to {community.name}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Anyone with an active link can join. Revoking it stops future joins.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close invitations"
              onClick={close}
              className={communityButton}
            >
              <X size={18} />
            </button>
          </div>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (
                maxUses &&
                (!Number.isInteger(Number(maxUses)) ||
                  Number(maxUses) < 1 ||
                  Number(maxUses) > 10000)
              )
                return;
              create.mutate(undefined, {
                onSuccess: (invite) => {
                  setCreated(invite);
                  setCopyState('idle');
                },
              });
            }}
            className="space-y-3"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold block mb-2" id={`${titleId}-expiry`}>
                  Expires after
                </label>
                <Select
                  aria-label="Invitation expiry"
                  value={days}
                  onChange={setDays}
                  options={[
                    { value: '1', label: '1 day' },
                    { value: '7', label: '7 days' },
                    { value: '30', label: '30 days' },
                  ]}
                />
              </div>
              <label className="text-sm font-semibold">
                Maximum joins (optional)
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                  className={`${communityInput} mt-2`}
                  placeholder="No limit"
                />
              </label>
            </div>
            {maxUses &&
              (!Number.isInteger(Number(maxUses)) ||
                Number(maxUses) < 1 ||
                Number(maxUses) > 10000) && (
                <p role="alert" className="text-sm text-red-500">
                  Choose a whole number from 1 to 10,000.
                </p>
              )}
            <button type="submit" disabled={create.isPending} className={communityButton}>
              <Plus size={16} />
              {create.isPending ? 'Creating link…' : 'Create invitation link'}
            </button>
            {create.isError && (
              <p role="alert" className="text-sm text-red-500">
                Invitation could not be created. Try again.
              </p>
            )}
          </form>
          {created && (
            <div className="space-y-3 rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4">
              <label className="text-sm font-semibold">
                Invitation link
                <input
                  className={`${communityInput} mt-2`}
                  readOnly
                  value={url}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <p className="text-xs text-gray-500">
                Expires {new Date(created.expiresAt).toLocaleString(locale)}. The link is only shown
                here after creation.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={communityButton}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopyState('copied');
                    } catch {
                      setCopyState('error');
                    }
                  }}
                >
                  <Copy size={16} />
                  {copyState === 'copied' ? 'Copied' : 'Copy link'}
                </button>
                {typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    className={communityButton}
                    onClick={() =>
                      void navigator
                        .share({ title: community.name, text: `Join ${community.name}`, url })
                        .catch(() => setCopyState('error'))
                    }
                  >
                    <Share2 size={16} />
                    Share…
                  </button>
                )}
                <a
                  className={communityButton}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Join ${community.name}`)}`}
                >
                  Telegram
                </a>
                <a
                  className={communityButton}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(`Join ${community.name} ${url}`)}`}
                >
                  WhatsApp
                </a>
                <a
                  className={communityButton}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                >
                  Facebook
                </a>
              </div>
              {copyState === 'copied' && (
                <p role="status" className="text-sm text-purple-500">
                  Link copied.
                </p>
              )}
              {copyState === 'error' && (
                <p role="alert" className="text-sm text-red-500">
                  Could not share automatically. Select and copy the invitation link above.
                </p>
              )}
              <InviteDirectShare url={url} name={community.name} />
            </div>
          )}
          <div className="space-y-3 border-t border-black/10 dark:border-white/10 pt-4">
            <h3 className="font-semibold">Invitation history</h3>
            {invites.isPending && (
              <p role="status" className="text-sm text-gray-500">
                Loading invitations…
              </p>
            )}
            {invites.isError && (
              <p role="alert" className="text-sm text-red-500">
                Invitations could not be loaded.{' '}
                <button className="underline cursor-pointer" onClick={() => void invites.refetch()}>
                  Try again
                </button>
              </p>
            )}
            {invites.data?.data.length === 0 && (
              <p className="text-sm text-gray-500">No invitations created yet.</p>
            )}
            {invites.data?.data.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-black/10 dark:border-white/10 rounded-xl p-3"
              >
                <div className="text-sm">
                  <p>
                    {invite.revokedAt
                      ? 'Revoked'
                      : new Date(invite.expiresAt).getTime() < Date.now()
                        ? 'Expired'
                        : 'Invitation'}{' '}
                    · {invite.useCount}
                    {invite.maxUses ? ` / ${invite.maxUses}` : ''} joins
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires {new Date(invite.expiresAt).toLocaleString(locale)}
                  </p>
                </div>
                <button
                  className={communityButton}
                  type="button"
                  disabled={Boolean(invite.revokedAt) || revoke.isPending}
                  onClick={() => {
                    revoke.mutate(invite.id, {
                      onSuccess: () => {
                        if (created?.id === invite.id) setCreated(null);
                      },
                    });
                  }}
                >
                  Revoke link
                </button>
              </div>
            ))}
            {(inviteCursors.length > 1 || invites.data?.nextCursor) && (
              <nav aria-label="Invitation pages" className="flex gap-3">
                <button
                  className={communityButton}
                  disabled={inviteCursors.length === 1 || invites.isFetching}
                  onClick={() => setInviteCursors((old) => old.slice(0, -1))}
                >
                  Previous invitations
                </button>
                <button
                  className={communityButton}
                  disabled={!invites.data?.nextCursor || invites.isFetching}
                  onClick={() => {
                    const next = invites.data?.nextCursor;
                    if (next) setInviteCursors((old) => [...old, next]);
                  }}
                >
                  Next invitations
                </button>
              </nav>
            )}
            {revoke.isError && (
              <p role="alert" className="text-sm text-red-500">
                The link was not revoked. Try again.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function CommunityMembers({
  communityId,
  role,
  onLeave,
}: {
  communityId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  onLeave: () => void;
}) {
  const myId = useAuthStore((state) => state.userId);
  const titleId = useId();
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [showBans, setShowBans] = useState(false);
  const activeMembers = useCommunityMembers(communityId, !showBans, cursors[cursors.length - 1]);
  const bannedMembers = useCommunityBans(
    communityId,
    showBans && role !== 'MEMBER',
    cursors[cursors.length - 1],
  );
  const members = showBans ? bannedMembers : activeMembers;
  const [action, setAction] = useState<{
    userId: string;
    name: string;
    type: 'promote' | 'demote' | 'kick' | 'ban' | 'unban' | 'transfer' | 'leave';
  } | null>(null);
  const mutation = useCommunityAction(async () => {
    if (!action) return;
    switch (action.type) {
      case 'promote':
        return communitiesApi.role(communityId, action.userId, 'ADMIN');
      case 'demote':
        return communitiesApi.role(communityId, action.userId, 'MEMBER');
      case 'kick':
        return communitiesApi.kick(communityId, action.userId);
      case 'ban':
        return communitiesApi.ban(communityId, action.userId);
      case 'unban':
        return communitiesApi.unban(communityId, action.userId);
      case 'transfer':
        return communitiesApi.transfer(communityId, action.userId);
      case 'leave':
        return communitiesApi.leave(communityId);
    }
  });
  const verbs = {
    promote: 'Make admin',
    demote: 'Remove admin role',
    kick: 'Remove member',
    ban: 'Ban member',
    unban: 'Remove ban',
    transfer: 'Transfer ownership',
    leave: 'Leave community',
  };
  return (
    <section aria-label="Community members" className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users size={19} />
          Members
        </h2>
        {role !== 'OWNER' && (
          <button
            className={communityButton}
            onClick={() => setAction({ userId: myId ?? '', name: 'this community', type: 'leave' })}
          >
            Leave community
          </button>
        )}
      </div>
      {role === 'OWNER' && (
        <p className="text-sm text-gray-500">
          Transfer ownership to an active member before leaving or deleting your account.
        </p>
      )}
      {role !== 'MEMBER' && (
        <div className="flex flex-wrap gap-2">
          <button
            className={communityButton}
            aria-pressed={!showBans}
            onClick={() => {
              setShowBans(false);
              setCursors([undefined]);
            }}
          >
            Active members
          </button>
          <button
            className={communityButton}
            aria-pressed={showBans}
            onClick={() => {
              setShowBans(true);
              setCursors([undefined]);
            }}
          >
            Banned accounts
          </button>
        </div>
      )}
      {members.isSuccess && members.data.data.length === 0 && (
        <p className="text-sm text-gray-500">
          {showBans ? 'No banned accounts.' : 'No members on this page.'}
        </p>
      )}
      {members.isPending && <p role="status">Loading members…</p>}
      {members.isError && (
        <p role="alert">
          Members could not be loaded.{' '}
          <button className={communityButton} onClick={() => void members.refetch()}>
            Try again
          </button>
        </p>
      )}
      {members.data?.data.map((member) => (
        <div
          key={member.userId}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 p-3"
        >
          <Avatar src={member.avatar} size="sm" />
          <div className="flex-1 min-w-24">
            <Link to={`/${member.username}`} className="font-semibold text-sm hover:underline">
              {member.displayName || member.username}
            </Link>
            <p className="text-xs text-gray-500">
              {member.state === 'BANNED'
                ? 'Banned'
                : member.state === 'LEFT'
                  ? 'Left'
                  : member.role === 'OWNER'
                    ? 'Owner'
                    : member.role === 'ADMIN'
                      ? 'Admin'
                      : 'Member'}
            </p>
          </div>
          {member.userId !== myId &&
            role !== 'MEMBER' &&
            member.role !== 'OWNER' &&
            (role === 'OWNER' || member.role === 'MEMBER') && (
              <div className="flex flex-wrap gap-2">
                {member.state === 'BANNED' ? (
                  <button
                    className={communityButton}
                    onClick={() =>
                      setAction({ userId: member.userId, name: member.username, type: 'unban' })
                    }
                  >
                    Remove ban
                  </button>
                ) : (
                  member.state === 'ACTIVE' && (
                    <>
                      {role === 'OWNER' && (
                        <>
                          <button
                            className={communityButton}
                            onClick={() =>
                              setAction({
                                userId: member.userId,
                                name: member.username,
                                type: member.role === 'ADMIN' ? 'demote' : 'promote',
                              })
                            }
                          >
                            <Shield size={15} />
                            {member.role === 'ADMIN' ? 'Remove admin role' : 'Make admin'}
                          </button>
                          <button
                            className={communityButton}
                            onClick={() =>
                              setAction({
                                userId: member.userId,
                                name: member.username,
                                type: 'transfer',
                              })
                            }
                          >
                            Transfer ownership
                          </button>
                        </>
                      )}
                      <button
                        className={communityButton}
                        onClick={() =>
                          setAction({ userId: member.userId, name: member.username, type: 'kick' })
                        }
                      >
                        Remove
                      </button>
                      <button
                        className={communityButton}
                        onClick={() =>
                          setAction({ userId: member.userId, name: member.username, type: 'ban' })
                        }
                      >
                        Ban
                      </button>
                    </>
                  )
                )}
              </div>
            )}
        </div>
      ))}
      {(cursors.length > 1 || members.data?.nextCursor) && (
        <nav aria-label="Member pages" className="flex gap-3">
          <button
            className={communityButton}
            disabled={cursors.length === 1 || members.isFetching}
            onClick={() => setCursors((old) => old.slice(0, -1))}
          >
            Previous members
          </button>
          <button
            className={communityButton}
            disabled={!members.data?.nextCursor || members.isFetching}
            onClick={() => {
              const next = members.data?.nextCursor;
              if (next) setCursors((old) => [...old, next]);
            }}
          >
            Next members
          </button>
        </nav>
      )}
      {action && (
        <Modal
          dismissible={!mutation.isPending}
          onClose={() => {
            if (!mutation.isPending) setAction(null);
          }}
          aria-labelledby={titleId}
        >
          {() => (
            <div className={surface}>
              <h2 id={titleId} className="text-xl font-bold">
                {verbs[action.type]}?
              </h2>
              <p className="text-sm text-gray-500">
                {action.type === 'transfer'
                  ? `${action.name} will become the owner. You will become an admin.`
                  : action.type === 'ban'
                    ? `${action.name} will lose access to every channel and cannot rejoin with an invitation until unbanned.`
                    : action.type === 'kick' || action.type === 'leave'
                      ? `${action.name} will lose access to every channel. Joining again requires an invitation.`
                      : `Update access for ${action.name} across every channel.`}
              </p>
              {mutation.isError && (
                <p role="alert" className="text-red-500 text-sm">
                  Could not update this member. No success has been confirmed. Try again.
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  className={communityButton}
                  autoFocus
                  disabled={mutation.isPending}
                  onClick={() => setAction(null)}
                >
                  Cancel
                </button>
                <button
                  className={`${communityButton} bg-purple-600 text-white`}
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate(undefined, {
                      onSuccess: () => {
                        if (action.type === 'leave') onLeave();
                        setAction(null);
                      },
                    })
                  }
                >
                  {mutation.isPending ? 'Updating…' : verbs[action.type]}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}
