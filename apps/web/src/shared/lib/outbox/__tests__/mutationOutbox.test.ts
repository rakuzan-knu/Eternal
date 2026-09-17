import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MutationOutboxEngine, mutationOutboxDb, OutboxMutation } from '../mutationOutbox';

describe('MutationOutboxEngine', () => {
  beforeEach(async () => {
    await mutationOutboxDb.clear();
  });

  it('enqueues a chat message into outbox storage with pending status', async () => {
    const engine = new MutationOutboxEngine();
    const mutation = await engine.enqueueMessage('test-msg-1', {
      conversationId: 'conv-123',
      text: 'Hello offline world',
      clientSeq: 1,
    });

    expect(mutation.id).toBe('test-msg-1');
    expect(mutation.status).toBe('pending');
    expect(mutation.idempotencyKey).toBe('idemp_test-msg-1');
    expect(mutation.payload.text).toBe('Hello offline world');

    const pending = await mutationOutboxDb.getAllPending();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('test-msg-1');
  });

  it('flushes pending mutations FIFO when dispatcher succeeds', async () => {
    const engine = new MutationOutboxEngine();
    const sentMutations: OutboxMutation[] = [];
    engine.onMutationSent((m) => sentMutations.push(m));

    const dispatched: string[] = [];
    engine.setDispatcher(async (mutation) => {
      dispatched.push(mutation.id);
      return true;
    });

    await engine.enqueueMessage('msg-1', { conversationId: 'c1', text: 'first' }, false);
    await engine.enqueueMessage('msg-2', { conversationId: 'c1', text: 'second' }, false);

    await engine.flush();

    expect(dispatched).toEqual(['msg-1', 'msg-2']);
    expect(sentMutations.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);

    const remaining = await mutationOutboxDb.getAllPending();
    expect(remaining.length).toBe(0);
  });

  it('marks mutation as failed when dispatcher returns false without throwing', async () => {
    const engine = new MutationOutboxEngine();

    engine.setDispatcher(async (mutation) => {
      if (mutation.id === 'msg-fail') return false;
      return true;
    });

    await engine.enqueueMessage('msg-fail', { conversationId: 'c1', text: 'bad message' }, false);
    await engine.flush();

    const stored = await mutationOutboxDb.get('msg-fail');
    expect(stored?.status).toBe('failed');
  });

  it('freezes flushing immediately if browser indicates offline', async () => {
    const engine = new MutationOutboxEngine();
    const dispatched: string[] = [];

    engine.setDispatcher(async (mutation) => {
      dispatched.push(mutation.id);
      return true;
    });

    // Mock navigator.onLine to false before enqueuing
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await engine.enqueueMessage('msg-offline-1', { conversationId: 'c1', text: 'one' });
    await engine.enqueueMessage('msg-offline-2', { conversationId: 'c1', text: 'two' });

    await engine.flush();

    expect(dispatched.length).toBe(0);
    const pending = await mutationOutboxDb.getAllPending();
    expect(pending.length).toBe(2);

    // Restore online
    vi.restoreAllMocks();
    await engine.flush();
    expect(dispatched).toEqual(['msg-offline-1', 'msg-offline-2']);
  });
});
