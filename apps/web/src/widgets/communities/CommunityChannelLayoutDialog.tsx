import { useId, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import {
  communityChannelLayoutSchema,
  type CommunityChannelsResponse,
} from '@social-network/shared-contracts';
import { communitiesApi, useCommunityAction } from '@/features/communities';
import Modal from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { communityButton, communityInput } from './communityStyles';
import { CommunityChannelArchiveDialog } from './CommunityChannelArchiveDialog';
import { CommunityChannelAccessDialog } from './CommunityChannelAccessDialog';

export function CommunityChannelLayoutDialog({
  layout,
  onClose,
}: {
  layout: CommunityChannelsResponse & { revision: number };
  onClose: () => void;
}) {
  const title = useId();
  const errorId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [initial] = useState(() => ({
    revision: layout.revision,
    categories: (layout.categories ?? []).map(({ id, name }) => ({ id, name })),
    channels: layout.data.map(({ id, name, description, categoryId }) => ({
      id,
      name,
      description,
      categoryId: categoryId ?? null,
    })),
  }));
  const [draft, setDraft] = useState(initial);
  const [validation, setValidation] = useState('');
  const [discard, setDiscard] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [selected, setSelected] = useState(layout.data[0]?.id ?? '');
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const mutation = useCommunityAction(() =>
    communitiesApi.updateChannelLayout(
      layout.communityId,
      communityChannelLayoutSchema.parse(draft),
    ),
  );
  const conflict = axios.isAxiosError(mutation.error) && mutation.error.response?.status === 409;
  const close = () => {
    if (mutation.isPending) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  const move = (kind: 'channels' | 'categories', index: number, delta: number) => {
    setDraft((current) => {
      const next = index + delta;
      if (next < 0 || next >= current[kind].length) return current;
      return kind === 'channels'
        ? {
            ...current,
            channels: current.channels.map(
              (_, i) => current.channels[i === index ? next : i === next ? index : i],
            ),
          }
        : {
            ...current,
            categories: current.categories.map(
              (_, i) => current.categories[i === index ? next : i === next ? index : i],
            ),
          };
    });
  };
  const channel = draft.channels.find((item) => item.id === selected);
  const originalChannel = layout.data.find((item) => item.id === selected);
  const changeChannel = (
    patch: Partial<Pick<NonNullable<typeof channel>, 'name' | 'description' | 'categoryId'>>,
  ) =>
    setDraft((current) => ({
      ...current,
      channels: current.channels.map((item) =>
        item.id === selected ? { ...item, ...patch } : item,
      ),
    }));

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
        <form
          ref={formRef}
          noValidate
          className="community-layout-dialog"
          onSubmit={(event) => {
            event.preventDefault();
            if (mutation.isPending || discard) return;
            const parsed = communityChannelLayoutSchema.safeParse(draft);
            if (!parsed.success) {
              setValidation(
                'Give every channel and category a name (up to 80 characters). Descriptions allow up to 1000 characters.',
              );
              const path = parsed.error.issues[0]?.path.join('.');
              const field = path ? formRef.current?.elements.namedItem(path) : null;
              if (field instanceof HTMLElement) field.focus();
              return;
            }
            setValidation('');
            mutation.mutate(undefined, { onSuccess: onClose });
          }}
        >
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 id={title} className="text-xl font-bold">
                Manage channels
              </h2>
              <p className="mt-2 text-sm">
                Organize conversations and manage channel access. Categories are visible to all
                community members; private channels are visible only to authorized members.
              </p>
            </div>
            <button
              type="button"
              className={communityButton}
              aria-label="Close channel management"
              disabled={mutation.isPending}
              onClick={close}
            >
              <X size={18} />
            </button>
          </header>
          {discard ? (
            <div role="alert" className="space-y-4">
              <p>Discard your unsaved channel changes?</p>
              <button
                autoFocus
                type="button"
                className={communityButton}
                onClick={() => setDiscard(false)}
              >
                Keep editing
              </button>{' '}
              <button type="button" className={communityButton} onClick={onClose}>
                Discard changes
              </button>
            </div>
          ) : (
            <>
              <fieldset disabled={mutation.isPending} className="space-y-4 min-w-0">
                <legend className="font-semibold mb-3">Categories</legend>
                {draft.categories.length === 0 && (
                  <p className="text-sm">No categories yet. Channels stay under Uncategorized.</p>
                )}
                {draft.categories.map((category, index) => (
                  <div key={category.id} className="community-layout-category">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Category {index + 1} name</span>
                      <input
                        name={`categories.${index}.name`}
                        aria-invalid={Boolean(validation) && !category.name.trim()}
                        aria-describedby={validation ? errorId : undefined}
                        className={communityInput}
                        value={category.name}
                        maxLength={80}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            categories: current.categories.map((item) =>
                              item.id === category.id
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={communityButton}
                      aria-label={`Move category ${category.name || index + 1} up`}
                      disabled={index === 0}
                      onClick={() => move('categories', index, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className={communityButton}
                      aria-label={`Move category ${category.name || index + 1} down`}
                      disabled={index === draft.categories.length - 1}
                      onClick={() => move('categories', index, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className={communityButton}
                      aria-label={`Remove category ${category.name || index + 1}; keep its channels`}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          categories: current.categories.filter((item) => item.id !== category.id),
                          channels: current.channels.map((item) =>
                            item.categoryId === category.id ? { ...item, categoryId: null } : item,
                          ),
                        }))
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={communityButton}
                  disabled={draft.categories.length >= 50}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      categories: [
                        ...current.categories,
                        { id: crypto.randomUUID(), name: 'New category' },
                      ],
                    }))
                  }
                >
                  <Plus size={16} /> Add category
                </button>
                <p className="text-sm">
                  Removing a category keeps its channels under Uncategorized. Changes apply when you
                  save.
                </p>
              </fieldset>
              <fieldset disabled={mutation.isPending} className="space-y-3 min-w-0">
                <legend className="font-semibold mb-3">Channels</legend>
                {!draft.channels.length && (
                  <p>No channels yet. Create a channel from community navigation.</p>
                )}
                <ol className="community-layout-channel-order">
                  {draft.channels.map((item, index) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`${communityButton} min-w-0 flex-1 justify-start`}
                        aria-pressed={selected === item.id}
                        onClick={() => setSelected(item.id)}
                      >
                        <span className="truncate"># {item.name}</span>
                      </button>
                      <button
                        type="button"
                        className={communityButton}
                        aria-label={`Move channel ${item.name} up`}
                        disabled={index === 0}
                        onClick={() => move('channels', index, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className={communityButton}
                        aria-label={`Move channel ${item.name} down`}
                        disabled={index === draft.channels.length - 1}
                        onClick={() => move('channels', index, 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </li>
                  ))}
                </ol>
                {channel && (
                  <div className="space-y-3">
                    <label className="block">
                      Channel name
                      <input
                        name={`channels.${draft.channels.indexOf(channel)}.name`}
                        className={communityInput}
                        value={channel.name}
                        maxLength={80}
                        aria-invalid={Boolean(validation) && !channel.name.trim()}
                        aria-describedby={validation ? errorId : undefined}
                        onChange={(event) => changeChannel({ name: event.target.value })}
                      />
                    </label>
                    <label className="block">
                      Description
                      <textarea
                        className={`${communityInput} resize-none`}
                        rows={3}
                        value={channel.description}
                        maxLength={1000}
                        onChange={(event) => changeChannel({ description: event.target.value })}
                      />
                    </label>
                    <Select
                      aria-label="Channel category"
                      value={channel.categoryId ?? ''}
                      options={[
                        { value: '', label: 'Uncategorized' },
                        ...draft.categories.map((item) => ({
                          value: item.id,
                          label: item.name || 'Unnamed category',
                        })),
                      ]}
                      onChange={(categoryId) => changeChannel({ categoryId: categoryId || null })}
                      disabled={mutation.isPending}
                    />
                    {originalChannel && (
                      <>
                        <button
                          type="button"
                          className={communityButton}
                          disabled={dirty || mutation.isPending}
                          onClick={() => setAccessOpen(true)}
                        >
                          Manage channel access
                        </button>
                        <button
                          type="button"
                          className={communityButton}
                          disabled={dirty || mutation.isPending}
                          onClick={() => setArchiveOpen(true)}
                        >
                          {originalChannel.archivedAt ? 'Restore channel' : 'Archive channel'}
                        </button>
                        {dirty && (
                          <p className="text-sm">
                            Save your layout changes before changing access, archiving or restoring
                            a channel.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </fieldset>
              {(validation || mutation.isError) && (
                <p id={errorId} role="alert">
                  {validation ||
                    (conflict
                      ? 'Channels changed while you were editing. Your draft is kept. Close, reload the community and reopen management before saving again.'
                      : 'Could not save changes. Your draft is kept; try again.')}
                </p>
              )}
              <footer className="flex justify-end gap-3">
                <button
                  type="button"
                  className={communityButton}
                  onClick={close}
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${communityButton} bg-purple-600 text-white`}
                  disabled={mutation.isPending || !dirty || conflict}
                  aria-busy={mutation.isPending}
                >
                  {mutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </footer>
            </>
          )}
          {archiveOpen && originalChannel && (
            <CommunityChannelArchiveDialog
              channel={originalChannel}
              revision={layout.revision}
              onClose={() => setArchiveOpen(false)}
              onSaved={onClose}
            />
          )}
          {accessOpen && originalChannel && (
            <CommunityChannelAccessDialog
              channel={originalChannel}
              onClose={() => setAccessOpen(false)}
              onSaved={onClose}
            />
          )}
        </form>
      )}
    </Modal>
  );
}
