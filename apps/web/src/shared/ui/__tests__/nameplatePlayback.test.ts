import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerNameplate } from '../nameplatePlayback';

describe('Page-wide Nameplate decoder budget', () => {
  let intersection: IntersectionObserverCallback;
  const registrations: ReturnType<typeof registerNameplate>[] = [];
  const disconnect = vi.fn();
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersection = callback;
        }
        observe() {}
        unobserve() {}
        disconnect = disconnect;
      },
    );
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 8 });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: false },
    });
  });
  afterEach(() => {
    registrations.splice(0).forEach((r) => r.dispose());
    vi.unstubAllGlobals();
  });
  function rows(count: number, eligible = true) {
    return Array.from({ length: count }, () => {
      const element = document.createElement('span'),
        notify = vi.fn();
      const controller = registerNameplate(element, eligible, notify);
      registrations.push(controller);
      return { element, notify, controller };
    });
  }
  function visible(elements: Element[], value: boolean) {
    intersection(
      elements.map((target) => ({ target, isIntersecting: value })) as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
  }
  it('mounting 5000 rows opens zero players until visible and caps visible players at eight', () => {
    const all = rows(5000);
    expect(all.filter((e) => e.notify.mock.lastCall?.[0])).toHaveLength(0);
    visible(
      all.map((e) => e.element),
      true,
    );
    expect(all.filter((e) => e.notify.mock.lastCall?.[0])).toHaveLength(8);
    all[100]!.controller.promote();
    expect(all[100]!.notify).toHaveBeenLastCalledWith(true);
    expect(all.filter((e) => e.notify.mock.lastCall?.[0])).toHaveLength(8);
    visible(
      all.map((e) => e.element),
      false,
    );
    expect(all.filter((e) => e.notify.mock.lastCall?.[0])).toHaveLength(0);
  });
  it('motion-disabled rows never play', () => {
    const all = rows(20, false);
    visible(
      all.map((e) => e.element),
      true,
    );
    expect(all.every((e) => e.notify.mock.lastCall?.[0] === false)).toBe(true);
  });
  it('honors data-saving and low-memory devices', () => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 4 });
    const all = rows(20);
    visible(
      all.map((e) => e.element),
      true,
    );
    expect(all.filter((e) => e.notify.mock.lastCall?.[0])).toHaveLength(4);
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
    all[0]!.controller.promote();
    expect(all.filter((e) => e.notify.mock.lastCall?.[0])).toHaveLength(0);
  });
  it('releases slots when rows unmount', () => {
    const all = rows(9);
    visible(
      all.map((e) => e.element),
      true,
    );
    all[0]!.controller.dispose();
    expect(all[8]!.notify).toHaveBeenLastCalledWith(true);
    all.forEach((e) => e.controller.dispose());
    expect(disconnect).toHaveBeenCalled();
  });
});
