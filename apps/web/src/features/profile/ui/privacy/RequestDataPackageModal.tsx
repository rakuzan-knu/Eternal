import { useEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Download, Eye, EyeOff, X } from 'lucide-react';
import {
  CORE_DATA_EXPORT_SECTIONS,
  MESSENGER_DATA_EXPORT_SECTIONS,
  type DataExportSection,
} from '@social-network/shared-contracts';
import Modal from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useLanguageStore } from '@/shared/lib/language/languageStore';
import { prepareDataExport, saveDataExport } from '../../api/dataExportApi';

const SECTIONS = [...CORE_DATA_EXPORT_SECTIONS, ...MESSENGER_DATA_EXPORT_SECTIONS];
const COPY = {
  en: {
    title: 'Download your Eternal data',
    intro:
      'Choose the data to download as a JSON file on this device. No email or encrypted ZIP is sent.',
    scope:
      'Includes selected account, profile, settings, own posts, comments, and eligible sent messages. Media files, stories, reels, integrations, relationships, logs, and reports are excluded. Messages from conversations you can no longer access are excluded. Encrypted messages remain encrypted. The file lists further limitations.',
    safety:
      'The downloaded file is not encrypted and may contain private information. Keep it in a safe place. For other personal-data requests, contact eternalnet.support@proton.me.',
    password: 'Current password',
    show: 'Show password',
    hide: 'Hide password',
    select: 'Select all',
    deselect: 'Deselect all',
    download: 'Download JSON',
    cancel: 'Cancel',
    close: 'Close',
    preparing: 'Preparing',
    records: 'records received',
    done: 'File prepared. Your browser download has started.',
    error:
      'Could not prepare the file. No partial file was downloaded. Check your connection and try again.',
    credentials:
      'The password or session could not be verified. Check your password and sign in again if needed.',
    limit:
      'This export exceeds the download limit. Select fewer categories or contact eternalnet.support@proton.me for assistance.',
    rate: 'Too many requests. Wait a minute and try again, or contact eternalnet.support@proton.me for assistance with a larger export.',
    sections: {
      account: 'Account information',
      profile: 'Profile',
      settings: 'Settings',
      posts: 'Your posts',
      comments: 'Your comments',
      messages: 'Your eligible sent messages',
    },
  },
  uk: {
    title: 'Завантажити дані Eternal',
    intro:
      'Оберіть дані для завантаження у файлі JSON на цей пристрій. Лист та зашифрований ZIP не надсилаються.',
    scope:
      'Доступні вибрані дані облікового запису, профіль, налаштування, власні дописи, коментарі й доступні надіслані повідомлення. Медіафайли, історії, рілси, інтеграції, зв’язки, журнали й скарги не входять до файлу. Повідомлення з розмов, до яких ви втратили доступ, не входять до файлу. Зашифровані повідомлення залишаються зашифрованими. Інші обмеження зазначено у файлі.',
    safety:
      'Завантажений файл не зашифрований і може містити приватну інформацію. Зберігайте його в безпечному місці. Інші запити щодо персональних даних можна надіслати на eternalnet.support@proton.me.',
    password: 'Поточний пароль',
    show: 'Показати пароль',
    hide: 'Сховати пароль',
    select: 'Обрати все',
    deselect: 'Скасувати вибір',
    download: 'Завантажити JSON',
    cancel: 'Скасувати',
    close: 'Закрити',
    preparing: 'Підготовка',
    records: 'отримано записів',
    done: 'Файл підготовлено. Завантаження у браузері розпочато.',
    error:
      'Не вдалося підготувати файл. Частковий файл не завантажено. Перевірте з’єднання та спробуйте ще раз.',
    credentials:
      'Не вдалося перевірити пароль або сеанс. Перевірте пароль і за потреби увійдіть повторно.',
    limit:
      'Експорт перевищує ліміт завантаження. Оберіть менше категорій або зверніться по допомогу на eternalnet.support@proton.me.',
    rate: 'Забагато запитів. Зачекайте хвилину та повторіть спробу або зверніться на eternalnet.support@proton.me по допомогу з великим експортом.',
    sections: {
      account: 'Обліковий запис',
      profile: 'Профіль',
      settings: 'Налаштування',
      posts: 'Ваші дописи',
      comments: 'Ваші коментарі',
      messages: 'Ваші доступні надіслані повідомлення',
    },
  },
};

function DataPackageDialog({ onClose }: { onClose: () => void }) {
  const language = useLanguageStore((state) => state.currentLanguage);
  const t = COPY[language === 'Українська' ? 'uk' : 'en'];
  const [selected, setSelected] = useState<DataExportSection[]>(SECTIONS);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);

  const cancel = () => {
    running.current?.abort();
    running.current = null;
    setPassword('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (running.current || !password || selected.length === 0) return;
    const controller = new AbortController();
    running.current = controller;
    setPending(true);
    setError('');
    setStatus(t.preparing);
    const currentPassword = password;
    setPassword('');
    try {
      const file = await prepareDataExport({
        password: currentPassword,
        sections: selected,
        signal: controller.signal,
        onProgress: ({ section, records }) => {
          if (!controller.signal.aborted)
            setStatus(`${t.preparing}: ${t.sections[section]} · ${records} ${t.records}`);
        },
      });
      if (controller.signal.aborted) return;
      saveDataExport(file);
      setStatus(t.done);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const responseStatus = axios.isAxiosError(failure) ? failure.response?.status : undefined;
      setStatus('');
      setError(
        responseStatus === 401
          ? t.credentials
          : responseStatus === 429
            ? t.rate
            : responseStatus === 413 ||
                (failure instanceof Error && failure.message === 'EXPORT_LIMIT')
              ? t.limit
              : t.error,
      );
    } finally {
      if (running.current === controller) {
        running.current = null;
        setPending(false);
      }
    }
  };

  return (
    <Modal
      onClose={onClose}
      onBeforeClose={() => {
        cancel();
        return true;
      }}
      closeOnInputEscape
      aria-label={t.title}
    >
      {(requestClose) => (
        <form
          noValidate
          onSubmit={submit}
          aria-busy={pending}
          className="relative w-full max-w-xl glass-modal border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] text-gray-950 dark:text-white"
        >
          <div className="p-6 pr-14 border-b border-black/10 dark:border-white/10">
            <h2 className="text-lg font-bold">{t.title}</h2>
            <p className="text-sm mt-2">{t.intro}</p>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t.close}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto p-6 space-y-4">
            <p className="text-xs leading-relaxed">{t.scope}</p>
            <p className="text-xs leading-relaxed">{t.safety}</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => setSelected(selected.length === SECTIONS.length ? [] : SECTIONS)}
              className="text-sm underline focus-visible:outline cursor-pointer disabled:cursor-not-allowed"
            >
              {selected.length === SECTIONS.length ? t.deselect : t.select}
            </button>
            <fieldset disabled={pending} className="grid gap-2">
              <legend className="sr-only">{t.title}</legend>
              {SECTIONS.map((section) => (
                <label
                  key={section}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(section)}
                    onChange={() =>
                      setSelected((values) =>
                        values.includes(section)
                          ? values.filter((value) => value !== section)
                          : [...values, section],
                      )
                    }
                    className="size-4 accent-purple-600"
                  />
                  <span className="text-sm">{t.sections[section]}</span>
                </label>
              ))}
            </fieldset>
            <Input
              label={t.password}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              maxLength={256}
              value={password}
              disabled={pending}
              onChange={(event) => setPassword(event.target.value)}
              className="text-gray-950 dark:text-white"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t.hide : t.show}
                  className="p-1 focus-visible:outline cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <p role="status" className="text-sm min-h-5">
              {status}
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
          </div>
          <div className="p-5 border-t border-black/10 dark:border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={pending || !password || !selected.length}
              className="min-w-40 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-600 focus-visible:outline focus-visible:outline-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {pending ? t.preparing : t.download}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function RequestDataPackageModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const userId = useAuthStore((state) => state.userId);
  return isOpen ? <DataPackageDialog key={userId} onClose={onClose} /> : null;
}
