/** Standalone Vite development harness; not an application route or a build entry. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { nameplateSchema } from '@social-network/shared-contracts';
import { Nameplate } from '@/shared/ui/Nameplate';
import '../index.css';

const response = await fetch('/Profile-decorations/Nameplates/nameplate-collection.json');
if (!response.ok) throw new Error('Nameplate catalog unavailable');
const plates = nameplateSchema.array().parse(await response.json());
function VerificationList() {
  const [motion, setMotion] = useState(true);
  const [testName, setTestName] = useState('Al');
  const [font, setFont] = useState('inherit');
  return (
    <main className="bg-[var(--app-bg-color)] text-white min-h-screen p-5 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Проверка Nameplates: 1000 строк</h1>
      <p className="text-sm opacity-70 my-3">
        Тестовые строки, без аккаунтов. Используется тот же компонент, что и в приложении.
      </p>
      <button
        type="button"
        onClick={() => setMotion((value) => !value)}
        className="cursor-pointer rounded-lg border border-white/20 px-4 py-2 mb-4 hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
      >
        {motion ? 'Отключить анимацию' : 'Включить анимацию'}
      </button>
      <div className="flex gap-3 mb-4">
        <label className="text-sm min-w-0 flex-1">
          Имя для проверки
          <input
            value={testName}
            onChange={(event) => setTestName(event.target.value)}
            className="block w-full rounded border border-white/20 bg-black px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Шрифт имени
          <select
            value={font}
            onChange={(event) => setFont(event.target.value)}
            className="block rounded border border-white/20 bg-black px-2 py-1"
          >
            <option value="inherit">Обычный</option>
            <option value="monospace">Моноширинный</option>
          </select>
        </label>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 1000 }, (_, index) => (
          <div
            key={index}
            data-test-row={index}
            className="nameplate-row h-14 px-3 rounded-xl flex items-center gap-3"
          >
            <Nameplate nameplate={plates[index % plates.length]} motion={motion} />
            <span aria-hidden="true" className="h-8 w-8 rounded-full bg-slate-700 shrink-0" />
            <span
              data-nameplate-label
              data-nameplate-text
              style={{ fontFamily: font }}
              className="text-sm font-semibold truncate flex-1 min-w-0"
            >
              {index === 0
                ? testName
                : index === 1
                  ? 'Очень длинное имя, которое должно обрезаться по ширине строки'
                  : `Тестовая строка ${index + 1}`}
            </span>
            {index < 3 && (
              <span aria-hidden="true" data-test-badge className="text-cyan-400 shrink-0">
                ◆ ✓
              </span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<VerificationList />);
