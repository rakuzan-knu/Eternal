import { powerSaveBlocker } from 'electron';

export function createCallPower() {
  const active = new Set<string>();
  let blocker: number | undefined;
  const reset = () => {
    active.clear();
    if (blocker !== undefined) powerSaveBlocker.stop(blocker);
    blocker = undefined;
  };
  return {
    isActive: () => active.size > 0,
    setActive(scope: string, enabled: boolean) {
      if (enabled) active.add(scope);
      else active.delete(scope);
      if (active.size && blocker === undefined)
        blocker = powerSaveBlocker.start('prevent-app-suspension');
      else if (!active.size) reset();
    },
    reset,
  };
}
