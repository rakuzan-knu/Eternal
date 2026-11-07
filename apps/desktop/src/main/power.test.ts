import { beforeEach, describe, expect, it, vi } from 'vitest';

const blocker = vi.hoisted(() => ({ start: vi.fn(() => 42), stop: vi.fn() }));
vi.mock('electron', () => ({ powerSaveBlocker: blocker }));
import { createCallPower } from './power';

beforeEach(() => vi.clearAllMocks());

describe('call power ownership', () => {
  it('keeps one blocker while either a direct call or a mesh room is active', () => {
    const power = createCallPower();
    power.setActive('call', true);
    power.setActive('call', true);
    power.setActive('mesh', true);
    expect(blocker.start).toHaveBeenCalledExactlyOnceWith('prevent-app-suspension');
    power.setActive('call', false);
    expect(blocker.stop).not.toHaveBeenCalled();
    power.setActive('mesh', false);
    expect(blocker.stop).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('cleans all scopes on renderer loss and can start a new call', () => {
    const power = createCallPower();
    power.setActive('call', true);
    power.setActive('mesh', true);
    power.reset();
    power.reset();
    expect(blocker.stop).toHaveBeenCalledOnce();
    power.setActive('call', true);
    expect(blocker.start).toHaveBeenCalledTimes(2);
  });
});
