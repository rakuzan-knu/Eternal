import { systemPreferences } from 'electron';
import type { UiohookKeyboardEvent } from 'uiohook-napi';
import { isConfinedLinux } from '../shared/distribution';

export function createNativePtt(isFocused: () => boolean, onChange: (pressed: boolean) => void) {
  let native: typeof import('uiohook-napi') | undefined;
  let generation = 0;
  let keycode: number | undefined;
  let running = false;
  let pressed = false;
  const release = () => {
    if (pressed) {
      pressed = false;
      onChange(false);
    }
  };
  const keydown = (event: UiohookKeyboardEvent) => {
    if (
      !running ||
      event.keycode !== keycode ||
      pressed ||
      isFocused() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    pressed = true;
    onChange(true);
  };
  const keyup = (event: UiohookKeyboardEvent) => {
    if (event.keycode === keycode) release();
  };
  const stop = () => {
    generation++;
    release();
    if (native && running) {
      native.uIOhook.removeListener('keydown', keydown);
      native.uIOhook.removeListener('keyup', keyup);
      native.uIOhook.stop();
    }
    running = false;
  };
  return {
    async configure(enabled: boolean, code: string): Promise<boolean> {
      stop();
      if (
        !enabled ||
        isConfinedLinux() ||
        (process.platform === 'linux' &&
          (process.env.WAYLAND_DISPLAY ||
            process.env.XDG_SESSION_TYPE === 'wayland' ||
            !process.env.DISPLAY))
      )
        return false;
      if (process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(true))
        return false;
      const current = generation;
      try {
        native ??= await import('uiohook-napi');
        if (current !== generation) return false;
        const name = /^Key[A-Z]$/.test(code)
          ? code.slice(3)
          : /^Digit[0-9]$/.test(code)
            ? code.slice(5)
            : code === 'ShiftLeft'
              ? 'Shift'
              : code;
        keycode = Object.entries(native.UiohookKey).find(([key]) => key === name)?.[1];
        if (keycode === undefined) return false;
        native.uIOhook.on('keydown', keydown);
        native.uIOhook.on('keyup', keyup);
        native.uIOhook.start();
        running = true;
        return true;
      } catch {
        native?.uIOhook.removeListener('keydown', keydown);
        native?.uIOhook.removeListener('keyup', keyup);
        running = false;
        console.warn('Global push-to-talk unavailable; window keyboard controls remain available');
        return false;
      }
    },
    release,
    stop,
  };
}
