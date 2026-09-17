import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RollingLiveSummaryEngine } from '../rollingLiveSummaryEngine';

describe('RollingLiveSummaryEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accumulates transcript segments and prunes segments beyond 15-minute window', () => {
    const engine = new RollingLiveSummaryEngine(15);
    const baseTime = 100000000;
    vi.setSystemTime(baseTime);

    engine.addSegment('u1', 'Alice', 'Hello everyone, welcome to the weekly standup.');
    engine.addSegment('u2', 'Bob', 'Hi Alice, let us review the sprint goals.');

    expect(engine.getSegments()).toHaveLength(2);

    // Fast-forward 16 minutes into the future
    vi.setSystemTime(baseTime + 16 * 60 * 1000);

    // Adding a new segment triggers prune
    engine.addSegment('u3', 'Charlie', 'Sorry I am late.');
    const segments = engine.getSegments();
    expect(segments).toHaveLength(1);
    expect(segments[0].speakerName).toBe('Charlie');
  });

  it('extracts key topics, action items, and current context using offline NLP', async () => {
    const engine = new RollingLiveSummaryEngine(15);

    engine.addSegment('u1', 'Alice', 'We need to deploy the new WebRTC audio mixer by tomorrow.');
    engine.addSegment('u2', 'Bob', 'I agree. I will do the backend gateway integration today.');
    engine.addSegment('u1', 'Alice', 'Great, let us make sure all tests pass before merging.');
    engine.addSegment('u3', 'Charlie', 'Currently checking WebGPU shaders and canvas latency.');

    const summary = await engine.generateSummary();

    expect(summary.provider).toBe('local_nlp');
    expect(summary.speakerCount).toBe(3);
    expect(summary.segmentCount).toBe(4);
    expect(summary.keyTopics.length).toBeGreaterThan(0);
    expect(summary.actionItems.length).toBeGreaterThan(0);
    // Should have captured Bob's commitment or Alice's need to deploy
    const actionText = summary.actionItems.join(' ');
    expect(actionText).toMatch(/need to|will do/i);
    expect(summary.currentContext).toContain('Charlie');
  });

  it('handles empty transcript gracefully', async () => {
    const engine = new RollingLiveSummaryEngine(15);
    const summary = await engine.generateSummary();

    expect(summary.segmentCount).toBe(0);
    expect(summary.speakerCount).toBe(0);
    expect(summary.provider).toBe('local_nlp');
  });

  it('uses Gemini API when API key is provided and valid JSON response is received', async () => {
    const engine = new RollingLiveSummaryEngine(15, 'mock-gemini-key');

    engine.addSegment('u1', 'Alice', 'Discussion about quantum security.');
    engine.addSegment('u2', 'Bob', 'We agreed on implementing Kyber-768.');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    keyTopics: ['Post-quantum cryptography', 'Kyber-768 standard'],
                    actionItems: ['Implement Kyber-768 by end of month'],
                    currentContext: 'Team agreed on quantum-resistant algorithms',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    (globalThis as any).fetch = mockFetch;

    const summary = await engine.generateSummary();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(summary.provider).toBe('gemini');
    expect(summary.keyTopics).toContain('Post-quantum cryptography');
    expect(summary.actionItems).toContain('Implement Kyber-768 by end of month');
  });

  it('falls back to local NLP when Gemini API call fails', async () => {
    const engine = new RollingLiveSummaryEngine(15, 'broken-key');

    engine.addSegment('u1', 'Alice', 'Need to review PR #123.');

    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const summary = await engine.generateSummary();

    expect(summary.provider).toBe('local_nlp');
    expect(summary.actionItems.length).toBeGreaterThan(0);
  });
});
