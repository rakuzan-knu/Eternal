/**
 * Recommendation scoring via @social-network/feed-score.
 *
 * Locks the production contract with hand-computed expectations (independent
 * of the implementation): composite weights, reason cards, ordering, and the
 * unknown-candidate invariant. If the core ever drifts from the legacy
 * formula, these fail first.
 */

import { rankCandidates } from '@social-network/feed-score';

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    distKm: null,
    allowNearby: true,
    city: null,
    mutuals: [],
    mutualCount: 0,
    followersCount: 0,
    lastActiveAtMs: null,
    ...overrides,
  };
}

describe('recommendation scoring contract (feed-score v1 preset)', () => {
  it('textbook composite: prox 0.9, mut 0.6, pop 0.5 -> 0.70, NEARBY reason', () => {
    const [r] = rankCandidates([
      candidate({ id: 'u', distKm: 10, mutualCount: 3, followersCount: 99 }),
    ]);
    expect(r.score).toBeCloseTo(0.7, 9);
    expect(r.parts).toMatchObject({ proximity: 0.9, mutual: 0.6, popularity: 0.5 });
    expect(r.reason.type).toBe('NEARBY');
  });

  it('mutual-friends card with correct pluralization', () => {
    const [two] = rankCandidates([
      candidate({
        id: 'u',
        mutualCount: 2,
        mutuals: [
          { id: 'm1', username: 'anna', avatar: null },
          { id: 'm2', username: 'bob', avatar: null },
        ],
      }),
    ]);
    expect(two.reason).toEqual({
      type: 'MUTUAL_FRIENDS',
      text: 'Followed by anna and 1 other',
      mutualFriends: [
        { id: 'm1', username: 'anna', avatar: null },
        { id: 'm2', username: 'bob', avatar: null },
      ],
      totalMutualCount: 2,
    });

    const [three] = rankCandidates([
      candidate({
        id: 'u',
        mutualCount: 3,
        mutuals: [
          { id: 'm1', username: 'anna', avatar: null },
          { id: 'm2', username: 'bob', avatar: null },
        ],
      }),
    ]);
    expect(three.reason.text).toBe('Followed by anna and 2 others');
  });

  it('city card vs plain nearby vs popular fallback', () => {
    const [city] = rankCandidates([candidate({ distKm: 40, city: 'Kyiv' })]);
    expect(city.reason).toEqual({ type: 'SAME_CITY', text: 'From your city (Kyiv)' });

    const [near] = rankCandidates([candidate({ distKm: 40, city: null })]);
    expect(near.reason).toEqual({ type: 'NEARBY', text: 'Near you' });

    const [pop] = rankCandidates([candidate({ distKm: 500, followersCount: 9999 })]);
    expect(pop.reason).toEqual({ type: 'POPULAR', text: 'Suggested for you' });
    expect(pop.score).toBeCloseTo(0.2, 9); // popularity capped at 1.0 * 0.2
  });

  it('ranks score-desc with stable ties', () => {
    const ranked = rankCandidates([
      candidate({ id: 'low', followersCount: 0 }),
      candidate({ id: 'high', followersCount: 9999 }),
      candidate({ id: 'tie-b' }),
      candidate({ id: 'tie-a' }),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(['high', 'low', 'tie-b', 'tie-a']);
  });

  it('decay and affinity parts compute but stay unweighted in the v1 preset', () => {
    const [r] = rankCandidates([
      candidate({ id: 'u', lastActiveAtMs: Date.now(), interests: [1, 1, 1] }),
    ]);
    // Parts are observable for future tuning, but v1 weights zero them out.
    expect(r.parts.recency).toBeCloseTo(1, 9);
    expect(r.parts.affinity).toBe(0); // no viewer vector passed
    expect(r.score).toBe(0);
  });
});
