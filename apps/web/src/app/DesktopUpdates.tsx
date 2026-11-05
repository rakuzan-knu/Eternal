import { useEffect, useRef, useState } from 'react';
import type { UpdateState } from '../../../desktop/src/shared/updates';
import { getDesktopBridge } from '@/shared/lib/platform';
import { useLanguageStore } from '@/shared/lib/language/languageStore';
import { Button } from '@/shared/ui/Button';

const copy = {
  en: {
    title: 'Eternal updates',
    available: 'Update available',
    required: 'Update required',
    downloading: 'Downloading update',
    ready: 'Ready to install',
    error: 'Unable to update. Check your connection, finish any active call and retry.',
    policyError: 'Unable to refresh the minimum version policy. The last known policy is retained.',
    retry: 'Check again',
    download: 'Download update',
    manual: 'Open download page',
    install: 'Restart and install',
    later: 'Later',
    managed: 'Update through your administrator or application store.',
  },
  uk: {
    title: 'Оновлення Eternal',
    available: 'Доступне оновлення',
    required: 'Потрібне оновлення',
    downloading: 'Завантаження оновлення',
    ready: 'Готово до встановлення',
    error:
      'Не вдалося оновити. Перевірте з’єднання, завершіть активний дзвінок і повторіть спробу.',
    policyError: 'Не вдалося перевірити мінімальну версію. Збережено останню відому вимогу.',
    retry: 'Перевірити ще раз',
    download: 'Завантажити оновлення',
    manual: 'Відкрити сторінку завантаження',
    install: 'Перезапустити й установити',
    later: 'Пізніше',
    managed: 'Оновіть застосунок через адміністратора або магазин програм.',
  },
};

export function DesktopUpdates() {
  const language = useLanguageStore((state) => state.currentLanguage);
  const text = language === 'Українська' ? copy.uk : copy.en;
  const [state, setState] = useState<UpdateState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const mounted = useRef(false);
  const acting = useRef(false);
  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!desktop?.getUpdateState) return;
    mounted.current = true;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (disposed) return;
      let downloading = false;
      try {
        const next = await desktop.getUpdateState?.();
        if (!disposed && next) {
          setState(next);
          downloading = next.status === 'downloading';
        }
      } catch {
        if (!disposed) setFailed(true);
      }
      if (!disposed)
        timer = setTimeout(
          () => {
            void poll();
          },
          downloading ? 1000 : 10000,
        );
    };
    void Promise.resolve().then(poll);
    return () => {
      disposed = true;
      mounted.current = false;
      if (timer) clearTimeout(timer);
    };
  }, []);
  const key = state
    ? `${state.channel}:${state.status}:${state.latestVersion}:${state.minVersion}`
    : '';
  if (!state || state.mode === 'disabled') return null;
  const visible =
    state.required ||
    failed ||
    state.minimumCheckFailed ||
    ['available', 'downloading', 'downloaded', 'error'].includes(state.status);
  if (!visible || (!state.required && key === dismissed)) return null;
  const desktop = getDesktopBridge();
  const run = async (action: (() => Promise<unknown>) | undefined) => {
    if (!action || acting.current) return;
    acting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await action();
      const next = await desktop?.getUpdateState?.();
      if (mounted.current && next) setState(next);
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      acting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const downloading = state.status === 'downloading';
  const ready = state.status === 'downloaded';
  const hasUpdate = state.status === 'available' || ready;
  const manual = state.mode === 'manual';
  const action = ready
    ? desktop?.installUpdate
    : manual
      ? desktop?.openUpdateDownload
      : desktop?.downloadUpdate;
  const label = ready ? text.install : manual ? text.manual : text.download;
  return (
    <section
      aria-label={text.title}
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] rounded-2xl border border-(--eternal-semantic-border-control) bg-(--app-bg-color) text-(--app-text-primary) p-4 shadow-xl"
    >
      <p role="status" className="text-sm font-semibold break-words">
        {state.required
          ? text.required
          : downloading
            ? text.downloading
            : ready
              ? text.ready
              : state.status === 'available'
                ? text.available
                : text.title}
        {state.latestVersion ? ` · ${state.latestVersion}` : ''}
      </p>
      {downloading && (
        <progress
          aria-label={text.downloading}
          value={state.progress ?? 0}
          max={100}
          className="mt-3 w-full"
        />
      )}
      {(failed || state.error) && (
        <p role="alert" className="mt-2 text-sm">
          {text.error}
        </p>
      )}
      {state.minimumCheckFailed && <p className="mt-2 text-sm">{text.policyError}</p>}
      {state.mode === 'managed' && <p className="mt-2 text-sm">{text.managed}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {hasUpdate && state.mode !== 'managed' && (
          <Button
            type="button"
            disabled={busy || downloading || !action}
            aria-busy={busy}
            onClick={() => {
              void run(action);
            }}
            className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default"
          >
            {label}
          </Button>
        )}
        {!downloading && !ready && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !desktop?.checkForUpdates}
            onClick={() => {
              void run(desktop?.checkForUpdates);
            }}
            className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default"
            aria-busy={busy}
          >
            {text.retry}
          </Button>
        )}
        {!state.required && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => setDismissed(key)}
            className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default"
          >
            {text.later}
          </Button>
        )}
      </div>
    </section>
  );
}
