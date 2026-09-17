import { describe, it, expect, beforeEach } from 'vitest';
import { DominantSpeakerHysteresisEngine } from '../dominantSpeakerHysteresis';

describe('DominantSpeakerHysteresisEngine', () => {
  let engine: DominantSpeakerHysteresisEngine;

  beforeEach(() => {
    engine = new DominantSpeakerHysteresisEngine({
      emaAlpha: 0.5,
      hysteresisMargin: 0.15,
      minSpeechDurationMs: 300,
      hangoverDurationMs: 1000,
      silenceThreshold: 0.05,
    });
  });

  it('establishes dominant speaker after sustained speech', () => {
    let now = 1000;

    // Start speaking at t = 1000
    let dominant = engine.processSamples([{ userId: 'alice', volume: 0.5 }], now);
    expect(dominant).toBeNull(); // Candidate under evaluation

    // Still speaking at t = 1150 (< 300ms)
    now = 1150;
    dominant = engine.processSamples([{ userId: 'alice', volume: 0.5 }], now);
    expect(dominant).toBeNull();

    // Reaches 300ms threshold at t = 1300
    now = 1300;
    dominant = engine.processSamples([{ userId: 'alice', volume: 0.5 }], now);
    expect(dominant).toBe('alice');
  });

  it('rejects short transient spikes (cough, keyboard click) from competing participant', () => {
    let now = 1000;

    // Alice speaks and establishes dominance
    engine.processSamples([{ userId: 'alice', volume: 0.4 }], now);
    now = 1350;
    engine.processSamples([{ userId: 'alice', volume: 0.4 }], now);
    expect(engine.getDominantSpeakerId()).toBe('alice');

    // Bob coughs loudly (volume = 0.9) at t = 1400
    now = 1400;
    let dominant = engine.processSamples(
      [
        { userId: 'alice', volume: 0.3 },
        { userId: 'bob', volume: 0.9 },
      ],
      now,
    );
    expect(dominant).toBe('alice'); // Still Alice

    // Bob's cough ends after 100ms at t = 1500
    now = 1500;
    dominant = engine.processSamples(
      [
        { userId: 'alice', volume: 0.3 },
        { userId: 'bob', volume: 0.02 },
      ],
      now,
    );
    expect(dominant).toBe('alice'); // Bob never steals focus
  });

  it('switches dominant speaker when competitor speaks louder with sustained duration', () => {
    let now = 1000;

    // Alice establishes dominance
    engine.processSamples([{ userId: 'alice', volume: 0.3 }], now);
    now = 1350;
    engine.processSamples([{ userId: 'alice', volume: 0.3 }], now);
    expect(engine.getDominantSpeakerId()).toBe('alice');

    // Bob starts speaking much louder (> 15% margin) at t = 2000
    now = 2000;
    engine.processSamples(
      [
        { userId: 'alice', volume: 0.2 },
        { userId: 'bob', volume: 0.6 },
      ],
      now,
    );
    expect(engine.getDominantSpeakerId()).toBe('alice');

    // Bob sustains speech for 350ms (now = 2350)
    now = 2350;
    const dominant = engine.processSamples(
      [
        { userId: 'alice', volume: 0.2 },
        { userId: 'bob', volume: 0.6 },
      ],
      now,
    );

    expect(dominant).toBe('bob');
  });

  it('preserves dominant speaker during natural speech pauses within hangover window', () => {
    let now = 1000;

    // Alice speaks
    engine.processSamples([{ userId: 'alice', volume: 0.5 }], now);
    now = 1350;
    engine.processSamples([{ userId: 'alice', volume: 0.5 }], now);
    expect(engine.getDominantSpeakerId()).toBe('alice');

    // Alice pauses for 600ms (silence)
    now = 1950;
    let dominant = engine.processSamples([{ userId: 'alice', volume: 0.01 }], now);
    // Hangover is 1000ms, so Alice remains dominant
    expect(dominant).toBe('alice');

    // Alice continues pause past hangover window (t = 2500, > 1000ms pause)
    now = 2500;
    dominant = engine.processSamples([{ userId: 'alice', volume: 0.01 }], now);
    expect(dominant).toBeNull();
  });
});
