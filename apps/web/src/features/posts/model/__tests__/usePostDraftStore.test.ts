import { beforeEach, describe, expect, it } from 'vitest';
import { usePostDraftStore } from '../usePostDraftStore';
import { resetSessionStores } from '@/shared/model/resetSession';

describe('feed text draft', () => {
  beforeEach(() => {
    usePostDraftStore.setState({ text: '' });
  });

  it('keeps unsubmitted text and supports composer formatting updates', () => {
    usePostDraftStore.getState().setText('Unsent text');
    usePostDraftStore.getState().setText((previous) => `**${previous}**`);
    expect(usePostDraftStore.getState().text).toBe('**Unsent text**');
  });

  it('removes the previous account draft on session reset', () => {
    usePostDraftStore.getState().setText('Private unsent text');
    resetSessionStores();
    expect(usePostDraftStore.getState().text).toBe('');
    usePostDraftStore.getState().setText('New account text');
    expect(usePostDraftStore.getState().text).toBe('New account text');
  });

  it('does not let a late publication clear a newer or another account draft with identical text', () => {
    const store = usePostDraftStore.getState();
    store.setText('Same text');
    const submittedRevision = usePostDraftStore.getState().revision;
    store.setText('Same text');
    store.clearIfUnchanged(submittedRevision);
    expect(usePostDraftStore.getState().text).toBe('Same text');
    const outgoingRevision = usePostDraftStore.getState().revision;
    resetSessionStores();
    store.setText('Same text');
    store.clearIfUnchanged(outgoingRevision);
    expect(usePostDraftStore.getState().text).toBe('Same text');
    store.clearIfUnchanged(usePostDraftStore.getState().revision);
    expect(usePostDraftStore.getState().text).toBe('');
  });
});
