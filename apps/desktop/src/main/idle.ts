import { powerMonitor } from 'electron';
import type { DesktopIdleState } from '../shared/ipcContract';

export function createIdleMonitor(onChange: (state: DesktopIdleState) => void) {
  let locked = false;
  const getState = (): DesktopIdleState =>
    locked ? 'locked' : powerMonitor.getSystemIdleState(300);
  const update = () => onChange(getState());
  const lock = () => {
    locked = true;
    update();
  };
  const unlock = () => {
    locked = false;
    update();
  };
  powerMonitor.on('lock-screen', lock);
  powerMonitor.on('unlock-screen', unlock);
  powerMonitor.on('suspend', lock);
  powerMonitor.on('resume', unlock);
  const timer = setInterval(update, 15000);
  update();
  return {
    getState,
    dispose() {
      clearInterval(timer);
      powerMonitor.off('lock-screen', lock);
      powerMonitor.off('unlock-screen', unlock);
      powerMonitor.off('suspend', lock);
      powerMonitor.off('resume', unlock);
    },
  };
}
