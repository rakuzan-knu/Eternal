import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { RequestDataPackageModal } from '@/features/profile';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useLanguageStore } from '@/shared/lib/language/languageStore';

export function DataPackageVisualGuide() {
  const [open, setOpen] = useState(false);
  const userId = useAuthStore((state) => state.userId);
  const isUkrainian = useLanguageStore((state) => state.currentLanguage === 'Українська');
  const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-purple-700 text-white hover:bg-purple-600 focus-visible:outline focus-visible:outline-offset-4 cursor-pointer';
  return (
    <div className="my-8 rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
      <p>
        {isUkrainian
          ? 'Завантаження доступне після входу у ваш обліковий запис Eternal. Файл JSON готується на цьому пристрої; дані та пароль не надсилаються на пошту.'
          : 'Sign in to your Eternal account to download your data. The JSON file is prepared on this device; data and passwords are not emailed.'}
      </p>
      {userId ? (
        <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
          <Download size={18} />
          {isUkrainian ? 'Завантажити мої дані' : 'Download my data'}
        </button>
      ) : (
        <Link to="/login" className={buttonClass}>
          {isUkrainian ? 'Увійти в Eternal' : 'Sign in to Eternal'}
        </Link>
      )}
      <RequestDataPackageModal isOpen={open && !!userId} onClose={() => setOpen(false)} />
    </div>
  );
}
