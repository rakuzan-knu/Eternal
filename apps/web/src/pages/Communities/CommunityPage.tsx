import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Hash,
  Home,
  Info,
  Link2,
  LockKeyhole,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useUIStore } from '@/shared/model/useUIStore';
import { useLocale } from '@/shared/lib/language/locale';
import { SEOHead } from '@/shared/seo';
import {
  useCommunity,
  useCommunityChannels,
  useCommunityMembers,
  useMyCommunities,
} from '@/features/communities';
import {
  CommunityCreateDialog,
  CommunityInviteDialog,
  CommunityMembers,
  CommunityChannelLayoutDialog,
} from '@/widgets/communities';
import './community-workspace.css';

const CommunityConversation = lazy(() =>
  import('@/features/chat').then((module) => ({ default: module.CommunityConversation })),
);

export default function CommunityPage() {
  const { communityId = '', channelId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const expanded = useUIStore((state) => state.isSidebarExpanded);
  const locale = useLocale();
  const community = useCommunity(communityId);
  const channels = useCommunityChannels(communityId, authenticated);
  const mine = useMyCommunities(authenticated);
  const [dialog, setDialog] = useState<'channel' | 'invite' | 'edit' | 'layout' | null>(null);
  const [filter, setFilter] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const base = `/communities/${communityId}`;
  const role = channels.data?.role;
  const member = authenticated && channels.isSuccess;
  const admin = member && (role === 'OWNER' || role === 'ADMIN');
  const preview = useCommunityMembers(communityId, member);
  const view = channelId
    ? 'conversation'
    : params.get('view') === 'members'
      ? 'members'
      : params.get('view') === 'about'
        ? 'about'
        : 'overview';
  const selectedChannel = member
    ? channels.data.data.find((channel) => channel.id === channelId)
    : undefined;
  const channelRoute = (id: string) => `${base}/channels/${id}`;
  const visibleChannels =
    channels.data?.data.filter((channel) =>
      `${channel.name} ${channel.description}`
        .toLocaleLowerCase(locale)
        .includes(filter.trim().toLocaleLowerCase(locale)),
    ) ?? [];
  const denied =
    axios.isAxiosError(channels.error) && [403, 404].includes(channels.error.response?.status ?? 0);
  const chooseView = (next: string) => `${base}${next === 'overview' ? '' : `?view=${next}`}`;
  const closeConversation = () => navigate(base);
  const selectConversation = (id: string) => {
    const next = channels.data?.data.find((channel) => channel.conversationId === id);
    navigate(next ? channelRoute(next.id) : `/messages/${id}`);
  };
  const previousChannel = useRef(channelId);
  useEffect(() => {
    if (previousChannel.current && !channelId)
      document
        .getElementById(`community-channel-${previousChannel.current}`)
        ?.focus({ preventScroll: true });
    previousChannel.current = channelId;
  }, [channelId]);
  useEffect(() => {
    setDialog(null);
    setFilter('');
  }, [communityId]);
  useEffect(() => {
    if (!admin) setDialog(null);
  }, [admin]);

  return (
    <div
      className={`community-workspace ${channelId ? 'has-channel' : ''} ${view !== 'overview' ? 'has-detail' : ''} ${expanded ? 'global-nav-expanded' : ''}`}
    >
      <SEOHead
        title={`${selectedChannel ? `#${selectedChannel.name} · ` : ''}${community.data?.name ?? 'Community'} • Eternal`}
        description={community.data?.description || 'Your community on Eternal.'}
        canonical={base}
        noindex={Boolean(channelId)}
      />
      <nav className="community-server-rail" aria-label="Your servers">
        <Link
          to="/communities"
          className="community-server-icon"
          title="Discover communities"
          aria-label="Discover communities"
        >
          <Compass size={22} />
        </Link>
        <span className="community-rail-divider" />
        {mine.data?.data.map((server) => (
          <Link
            key={server.id}
            to={`/communities/${server.id}`}
            title={server.name}
            aria-label={`Open ${server.name}`}
            aria-current={server.id === communityId ? 'page' : undefined}
            className="community-server-icon"
          >
            {server.avatar ? (
              <img src={server.avatar} alt="" />
            ) : (
              <span>{server.name.slice(0, 2).toLocaleUpperCase(locale)}</span>
            )}
          </Link>
        ))}
        {mine.isError && (
          <Link
            to="/communities"
            className="community-server-icon"
            title="Open your communities"
            aria-label="Open your communities"
          >
            <Users size={20} />
          </Link>
        )}
        <Link
          to="/communities"
          className="community-server-icon community-server-add"
          title="Create or join a community"
          aria-label="Create or join a community"
        >
          <Plus size={22} />
        </Link>
      </nav>
      <aside className="community-channel-panel" aria-label="Community navigation">
        <Link to="/communities" className="community-back">
          <ArrowLeft size={15} /> All communities
        </Link>
        <header className="community-server-heading">
          <div className="community-server-mark">
            {community.data?.avatar ? (
              <img src={community.data.avatar} alt="" />
            ) : (
              (community.data?.name.slice(0, 2).toLocaleUpperCase(locale) ?? <Users size={25} />)
            )}
          </div>
          <h1>{community.data?.name ?? 'Community'}</h1>
          {community.data && (
            <p>
              {community.data.memberCount.toLocaleString(locale)} members ·{' '}
              {member ? 'Your community' : 'Join by invitation'}
            </p>
          )}
          {admin && (
            <button
              className="community-action community-action-primary"
              onClick={() => setDialog('invite')}
            >
              <Link2 size={16} /> Invite people
            </button>
          )}
        </header>
        <nav className="community-sections" aria-label="Community sections">
          <Link to={chooseView('overview')} aria-current={view === 'overview' ? 'page' : undefined}>
            <Home size={17} /> Overview
          </Link>
          {member && (
            <Link to={chooseView('members')} aria-current={view === 'members' ? 'page' : undefined}>
              <Users size={17} /> Members{' '}
              <span>{community.data?.memberCount.toLocaleString(locale)}</span>
            </Link>
          )}
          <Link to={chooseView('about')} aria-current={view === 'about' ? 'page' : undefined}>
            <Info size={17} /> About community
          </Link>
        </nav>
        {member && (
          <>
            <div className="community-channel-label">
              <h2>
                Channels <span>{channels.data.data.length}</span>
              </h2>
              {admin && (
                <button
                  aria-label="Create channel"
                  title="Create channel"
                  onClick={() => setDialog('channel')}
                >
                  <Plus size={17} />
                </button>
              )}
            </div>
            <div className="community-channel-search">
              <Search size={15} />
              <input
                ref={searchRef}
                aria-label="Filter channels"
                placeholder="Find a channel"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
              {filter && (
                <button
                  aria-label="Clear channel search"
                  onClick={() => {
                    setFilter('');
                    searchRef.current?.focus();
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <nav className="community-channel-list" aria-label="Community channels">
              {[{ id: '', name: 'Uncategorized' }, ...(channels.data.categories ?? [])].map(
                (category) => {
                  const grouped = visibleChannels.filter(
                    (channel) => !channel.archivedAt && (channel.categoryId ?? '') === category.id,
                  );
                  if (!grouped.length && filter) return null;
                  if (!grouped.length && !category.id) return null;
                  return (
                    <div key={category.id} className="community-channel-group">
                      <h3>{category.name}</h3>
                      {grouped.map((channel) => (
                        <Link
                          id={`community-channel-${channel.id}`}
                          key={channel.id}
                          to={channelRoute(channel.id)}
                          aria-current={channel.id === channelId ? 'page' : undefined}
                          title={channel.description || channel.name}
                        >
                          {channel.isPrivate ? (
                            <LockKeyhole size={19} aria-label="Private channel" />
                          ) : (
                            <Hash size={19} />
                          )}
                          <span>{channel.name}</span>
                        </Link>
                      ))}
                      {!grouped.length && <p>No channels in this category.</p>}
                    </div>
                  );
                },
              )}
              {visibleChannels.some((channel) => channel.archivedAt) && (
                <div className="community-channel-group">
                  <h3>Archived channels</h3>
                  {visibleChannels
                    .filter((channel) => channel.archivedAt)
                    .map((channel) => (
                      <Link
                        id={`community-channel-${channel.id}`}
                        key={channel.id}
                        to={channelRoute(channel.id)}
                        aria-current={channel.id === channelId ? 'page' : undefined}
                        title={channel.description || channel.name}
                      >
                        {channel.isPrivate ? (
                          <LockKeyhole size={19} aria-label="Private channel" />
                        ) : (
                          <Hash size={19} />
                        )}
                        <span>{channel.name}</span>
                        <span className="sr-only"> (archived)</span>
                      </Link>
                    ))}
                </div>
              )}
              {!visibleChannels.length && (
                <p>{filter ? 'No channels match your search.' : 'No channels yet.'}</p>
              )}
            </nav>
          </>
        )}
        <footer className="community-channel-footer">
          {admin && (
            <button
              className="community-action"
              onClick={() => setDialog('layout')}
              disabled={channels.data?.revision === undefined}
              title={
                channels.data?.revision === undefined
                  ? 'Channel management requires the updated community service.'
                  : undefined
              }
            >
              <Settings2 size={16} /> Manage channels
            </button>
          )}
          {admin && (
            <button className="community-action" onClick={() => setDialog('edit')}>
              <Settings2 size={16} /> Edit community
            </button>
          )}
          <Link to="/messages" className="community-action">
            <MessageSquare size={16} /> Direct messages <ArrowUpRight size={14} />
          </Link>
        </footer>
      </aside>
      <section className="community-content" aria-label="Community workspace">
        <header
          className={`community-content-header ${selectedChannel ? 'community-context-in-thread' : ''}`}
        >
          <div>
            <button
              className="community-mobile-back"
              onClick={closeConversation}
              aria-label="Back to community channels"
            >
              <ArrowLeft size={18} />
            </button>
            {selectedChannel ? (
              <Hash size={20} />
            ) : view === 'members' ? (
              <Users size={20} />
            ) : (
              <Home size={20} />
            )}
            <h2>
              {selectedChannel?.name ??
                (view === 'members'
                  ? 'Members'
                  : view === 'about'
                    ? 'About community'
                    : 'Overview')}
            </h2>
          </div>
          <div>
            {member && view !== 'members' && (
              <Link
                to={chooseView('members')}
                className="community-icon-button"
                aria-label="Open members"
                title="Members"
              >
                <Users size={19} />
              </Link>
            )}
            <Link
              to={chooseView('about')}
              className="community-icon-button"
              aria-label="About community"
              title="About community"
            >
              <Info size={19} />
            </Link>
          </div>
        </header>
        {community.isPending ? (
          <div className="community-workspace-state" role="status">
            Loading community…
          </div>
        ) : community.isError ? (
          <div className="community-workspace-state" role="alert">
            <h2>This community could not be loaded.</h2>
            <button className="community-action" onClick={() => void community.refetch()}>
              Try again
            </button>
          </div>
        ) : !authenticated ? (
          <div className="community-workspace-state">
            <ShieldCheck size={35} />
            <h2>An invitation opens the door.</h2>
            <p>
              {community.data.description ||
                'Get to know the people and conversations in this community.'}
            </p>
            <p>Ask an admin for an invitation. Channels become available after you join.</p>
            <Link
              className="community-action community-action-primary"
              to="/login"
              state={{ from: channelId ? channelRoute(channelId) : base }}
            >
              Sign in to accept an invitation
            </Link>
          </div>
        ) : channels.isPending ? (
          <div className="community-workspace-state" role="status">
            Loading your channels…
          </div>
        ) : channels.isError ? (
          <div className="community-workspace-state" role={denied ? undefined : 'alert'}>
            <ShieldCheck size={35} />
            <h2>{denied ? 'Join with an invitation' : 'Channels could not be loaded'}</h2>
            <p>
              {denied
                ? 'This page is public. Channels and member details become available after you accept an active invitation.'
                : 'Your membership has not changed. Check your connection and try again.'}
            </p>
            {!denied && (
              <button className="community-action" onClick={() => void channels.refetch()}>
                Try again
              </button>
            )}
          </div>
        ) : channelId ? (
          selectedChannel ? (
            <Suspense
              fallback={
                <div className="community-workspace-state" role="status">
                  Opening channel…
                </div>
              }
            >
              <CommunityConversation
                communityId={communityId}
                communityName={community.data?.name}
                conversationId={selectedChannel.conversationId}
                onClose={closeConversation}
                onSelectConversation={selectConversation}
              />
            </Suspense>
          ) : (
            <div className="community-workspace-state" role="alert">
              <h2>Channel unavailable</h2>
              <p>This channel may have been removed, or you may not have access.</p>
              <Link to={base} className="community-action">
                Back to channels
              </Link>
            </div>
          )
        ) : (
          <div className="community-content-scroll">
            {view === 'members' ? (
              <CommunityMembers
                communityId={communityId}
                role={channels.data.role}
                onLeave={() => navigate('/communities')}
              />
            ) : view === 'about' ? (
              <article className="community-about">
                <p className="community-eyebrow">ABOUT THIS COMMUNITY</p>
                <h2>{community.data.name}</h2>
                <p className="community-description">
                  {community.data.description || 'A shared home for conversation and connection.'}
                </p>
                <dl>
                  <div>
                    <dt>Members</dt>
                    <dd>{community.data.memberCount.toLocaleString(locale)}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>
                      {new Date(community.data.createdAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>Your role</dt>
                    <dd>{channels.data.role.toLowerCase()}</dd>
                  </div>
                </dl>
                <div className="community-access-note">
                  <ShieldCheck size={20} />
                  <div>
                    <h3>Membership by invitation</h3>
                    <p>
                      Community profiles are public. Conversations and member details are available
                      to members.
                    </p>
                  </div>
                </div>
                {admin && (
                  <div className="community-about-actions">
                    <button className="community-action" onClick={() => setDialog('edit')}>
                      <Settings2 size={16} />
                      Edit community
                    </button>
                    <button className="community-action" onClick={() => setDialog('invite')}>
                      <Link2 size={16} />
                      Invite people
                    </button>
                  </div>
                )}
              </article>
            ) : (
              <div className="community-overview-grid">
                <div>
                  <section className="community-welcome">
                    <p className="community-eyebrow">YOUR PEOPLE. YOUR SPACE.</p>
                    <h2>Welcome to {community.data.name}</h2>
                    <p>
                      {community.data.description ||
                        'Pick a channel, start a conversation and make yourself at home.'}
                    </p>
                    <div className="community-about-actions">
                      {channels.data.data[0] && (
                        <Link
                          className="community-action community-action-primary"
                          to={channelRoute(channels.data.data[0].id)}
                        >
                          <Hash size={17} />
                          Open {channels.data.data[0].name}
                        </Link>
                      )}
                      {admin && (
                        <button className="community-action" onClick={() => setDialog('invite')}>
                          <Link2 size={16} />
                          Invite people
                        </button>
                      )}
                    </div>
                  </section>
                  <section aria-label="Browse channels" className="community-browse">
                    <div className="community-section-heading">
                      <h2>Channels</h2>
                      {admin && (
                        <button className="community-action" onClick={() => setDialog('channel')}>
                          <Plus size={16} />
                          Create channel
                        </button>
                      )}
                    </div>
                    {channels.data.data.length ? (
                      channels.data.data.map((channel) => (
                        <Link
                          key={channel.id}
                          to={channelRoute(channel.id)}
                          className="community-browse-row"
                        >
                          <span className="community-hash">
                            {channel.isPrivate ? (
                              <LockKeyhole size={22} aria-label="Private channel" />
                            ) : (
                              <Hash size={22} />
                            )}
                          </span>
                          <div>
                            <h3>{channel.name}</h3>
                            <p>{channel.description || 'Start or continue the conversation'}</p>
                          </div>
                          <ArrowUpRight size={17} />
                        </Link>
                      ))
                    ) : (
                      <p className="community-empty">
                        No channels yet.{' '}
                        {admin
                          ? 'Create the first conversation.'
                          : 'An admin can create a channel.'}
                      </p>
                    )}
                  </section>
                </div>
                <aside className="community-people-preview" aria-label="People in this community">
                  <div className="community-section-heading">
                    <h2>People</h2>
                    <span>{community.data.memberCount.toLocaleString(locale)}</span>
                  </div>
                  {preview.isPending ? (
                    <p role="status">Loading people…</p>
                  ) : preview.isError ? (
                    <div role="alert">
                      <p>People could not be loaded.</p>
                      <button className="community-action" onClick={() => void preview.refetch()}>
                        Try again
                      </button>
                    </div>
                  ) : (
                    preview.data?.data.slice(0, 8).map((person) => (
                      <Link
                        key={person.userId}
                        to={`/${person.username}`}
                        className="community-person"
                      >
                        <span className="community-person-avatar">
                          {person.avatar ? (
                            <img src={person.avatar} alt="" />
                          ) : (
                            person.username.slice(0, 2).toLocaleUpperCase(locale)
                          )}
                        </span>
                        <div>
                          <strong>{person.displayName || person.username}</strong>
                          <span>
                            {person.role === 'OWNER'
                              ? 'Owner'
                              : person.role === 'ADMIN'
                                ? 'Admin'
                                : `@${person.username}`}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                  <Link to={chooseView('members')} className="community-action">
                    View all members <ArrowUpRight size={15} />
                  </Link>
                  <div className="community-access-note">
                    <ShieldCheck size={18} />
                    <p>Invite-only membership. Public community profile.</p>
                  </div>
                </aside>
              </div>
            )}
          </div>
        )}
      </section>
      {admin && community.data && dialog === 'channel' && (
        <CommunityCreateDialog
          communityId={communityId}
          onClose={() => setDialog(null)}
          onCreated={() => setDialog(null)}
        />
      )}
      {admin && community.data && dialog === 'edit' && (
        <CommunityCreateDialog
          community={community.data}
          onClose={() => setDialog(null)}
          onCreated={() => setDialog(null)}
        />
      )}
      {admin && dialog === 'layout' && channels.data?.revision !== undefined && (
        <CommunityChannelLayoutDialog
          layout={{ ...channels.data, communityId, revision: channels.data.revision }}
          onClose={() => setDialog(null)}
        />
      )}
      {admin && community.data && dialog === 'invite' && (
        <CommunityInviteDialog community={community.data} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
