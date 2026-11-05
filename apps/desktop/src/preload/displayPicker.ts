import { ipcRenderer } from 'electron';
import { getPickerCopy, pickerChannels, pickerDataSchema } from '../shared/displayPicker';

export function initializeDisplayPicker(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const title = document.getElementById('title');
    const intro = document.getElementById('intro');
    const status = document.getElementById('status');
    const sources = document.getElementById('sources');
    const retry = document.getElementById('retry');
    const cancel = document.getElementById('cancel');
    const share = document.getElementById('share');
    const audio = document.getElementById('audio');
    const audioLabel = document.getElementById('audio-label');
    const audioHint = document.getElementById('audio-hint');
    if (
      !title ||
      !intro ||
      !status ||
      !sources ||
      !retry ||
      !cancel ||
      !(share instanceof HTMLButtonElement) ||
      !(audio instanceof HTMLInputElement) ||
      !audioLabel ||
      !audioHint
    )
      return;
    let copy = getPickerCopy(navigator.language);
    let selected: string | null = null;
    const label = () => {
      title.textContent = copy.title;
      intro.textContent = copy.intro;
      retry.textContent = copy.retry;
      cancel.textContent = copy.cancel;
      share.textContent = copy.share;
      audioLabel.textContent = copy.audio;
      document.title = `${copy.title} — Eternal`;
    };
    const choose = async (id: string | null) => {
      share.disabled = true;
      try {
        await ipcRenderer.invoke(
          pickerChannels.choose,
          id === null ? null : { id, audio: audio.checked },
        );
      } catch {
        status.textContent = copy.error;
        share.disabled = selected === null;
      }
    };
    const load = async () => {
      selected = null;
      share.disabled = true;
      audio.checked = false;
      audio.disabled = true;
      retry.hidden = true;
      status.textContent = copy.loading;
      sources.replaceChildren();
      sources.setAttribute('aria-busy', 'true');
      try {
        const data = pickerDataSchema.parse(await ipcRenderer.invoke(pickerChannels.load));
        copy = getPickerCopy(data.locale);
        label();
        document.documentElement.lang = data.locale;
        for (const key of ['--app-bg-color', '--app-text-primary', '--app-accent-color']) {
          const value = data.theme[key];
          if (value && CSS.supports('color', value))
            document.documentElement.style.setProperty(key, value);
        }
        audio.disabled = !data.audioAvailable;
        audioHint.textContent = data.audioAvailable ? copy.audioHint : copy.noAudio;
        for (const source of data.sources) {
          const button = document.createElement('button');
          button.className = 'source';
          button.setAttribute('aria-pressed', 'false');
          if (source.thumbnail.startsWith('data:image/png;base64,')) {
            const img = document.createElement('img');
            img.className = 'preview';
            img.src = source.thumbnail;
            img.alt = '';
            button.append(img);
          } else {
            const preview = document.createElement('span');
            preview.className = 'preview';
            preview.textContent = copy.noPreview;
            button.append(preview);
          }
          const name = document.createElement('span');
          name.className = 'name';
          name.textContent = source.name;
          button.append(name);
          button.addEventListener('click', () => {
            selected = source.id;
            share.disabled = false;
            for (const child of sources.children)
              child.setAttribute('aria-pressed', String(child === button));
          });
          sources.append(button);
        }
        status.textContent = data.sources.length ? '' : copy.empty;
        retry.hidden = data.sources.length > 0;
      } catch {
        status.textContent = copy.error;
        retry.hidden = false;
      } finally {
        sources.setAttribute('aria-busy', 'false');
      }
    };
    label();
    cancel.focus();
    cancel.addEventListener('click', () => void choose(null));
    share.addEventListener('click', () => {
      if (selected !== null) void choose(selected);
    });
    retry.addEventListener('click', () => void load());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') void choose(null);
    });
    void load();
  });
}
