import { z } from 'zod';

export const pickerChannels = {
  load: 'desktop:picker-load',
  choose: 'desktop:picker-choose',
} as const;

export const pickerChoiceSchema = z.tuple([
  z
    .object({ id: z.string().max(256), audio: z.boolean() })
    .strict()
    .nullable(),
]);

export const pickerDataSchema = z.object({
  sources: z.array(z.object({ id: z.string(), name: z.string(), thumbnail: z.string() })),
  audioAvailable: z.boolean(),
  locale: z.string(),
  theme: z.record(z.string(), z.string().max(256)),
});

export const pickerCopy = {
  en: {
    title: 'Share your screen',
    intro: 'Choose a screen or window to share.',
    loading: 'Loading screens and windows…',
    empty:
      'No screens or windows are available. Check screen recording permissions in system settings.',
    error:
      'Could not load screens. Check screen recording permissions in system settings, then retry.',
    retry: 'Retry',
    cancel: 'Cancel',
    share: 'Share',
    audio: 'Share system audio',
    audioHint: 'Includes sound from all applications, even when sharing one window.',
    noAudio: 'System audio is unavailable on this platform. Your microphone can still be shared.',
    noPreview: 'Preview unavailable',
  },
  uk: {
    title: 'Демонстрація екрана',
    intro: 'Виберіть екран або вікно для демонстрації.',
    loading: 'Завантаження екранів і вікон…',
    empty:
      'Немає доступних екранів або вікон. Перевірте дозвіл на запис екрана в системних налаштуваннях.',
    error:
      'Не вдалося отримати екрани. Перевірте дозвіл на запис екрана в системних налаштуваннях і повторіть спробу.',
    retry: 'Повторити',
    cancel: 'Скасувати',
    share: 'Демонструвати',
    audio: 'Передавати системний звук',
    audioHint: 'Включає звук усіх програм, навіть під час демонстрації одного вікна.',
    noAudio: 'Системний звук недоступний на цій платформі. Мікрофон можна передавати окремо.',
    noPreview: 'Прев’ю недоступне',
  },
  ru: {
    title: 'Демонстрация экрана',
    intro: 'Выберите экран или окно для демонстрации.',
    loading: 'Загрузка экранов и окон…',
    empty:
      'Нет доступных экранов или окон. Проверьте разрешение на запись экрана в системных настройках.',
    error:
      'Не удалось получить экраны. Проверьте разрешение на запись экрана в системных настройках и повторите попытку.',
    retry: 'Повторить',
    cancel: 'Отмена',
    share: 'Поделиться',
    audio: 'Передавать системный звук',
    audioHint: 'Включает звук всех приложений, даже при демонстрации одного окна.',
    noAudio: 'Системный звук недоступен на этой платформе. Микрофон можно передавать отдельно.',
    noPreview: 'Предпросмотр недоступен',
  },
};

export function getPickerCopy(locale: string) {
  const language = locale.toLowerCase().split('-')[0];
  return language === 'uk' ? pickerCopy.uk : language === 'ru' ? pickerCopy.ru : pickerCopy.en;
}
