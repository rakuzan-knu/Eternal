import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { NotFoundMilkyWayMascot } from './ui/NotFoundMilkyWayMascot';
import { SEOHead } from '../../shared/seo';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { useAuthStore } from '../../shared/model/useAuthStore';
import {
  ArrowLeft,
  Home,
  MessageSquare,
  ShieldCheck,
  FileText,
  Download,
  Newspaper,
  Briefcase,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isUk = currentLanguage === 'Українська';

  const t = {
    badge: isUk ? 'Помилка 404 • Координати не знайдено' : 'Error 404 • Coordinates Not Found',
    title: isUk ? 'ЗАГУБИЛИСЯ У ЧУМАЦЬКОМУ ШЛЯХУ?' : 'LOST IN THE MILKY WAY?',
    subtitle: isUk
      ? 'Схоже, ви зійшли з цифрової карти та потрапили на зоряну стежку Чумацького Шляху. Не хвилюйтеся, навіть найкращі дослідники іноді відкривають дивовижні таємниці космосу. Давайте повернемося назад до ваших друзів, чатів та спільнот:'
      : 'Looks like you’ve stepped off the digital map and onto the cosmic stardust trail. Don’t worry, even the greatest explorers discover hidden wonders along the way. Let’s guide you back to your friends, conversations, and communities:',
    primaryActionAuth: isUk ? 'Повернутися до стрічки' : 'Return to Feed',
    secondaryActionAuth: isUk ? 'Відкрити повідомлення' : 'Open Messages',
    primaryActionGuest: isUk ? 'На головну / Увійти' : 'Go to Home / Login',
    secondaryActionGuest: isUk ? 'Завантажити додаток' : 'Download Eternal',
    backBtn: isUk ? 'Назад' : 'Go Back',
    statusPage: isUk ? 'Сторінка статусу' : 'Status Page',
    twitterLink: '@Eternal',
    supportLink: isUk ? 'Підтримка Eternal' : 'Eternal Support',
    termsLink: isUk ? 'Умови та Конфіденційність' : 'Terms & Privacy',
    careersLink: isUk ? 'Вакансії' : 'Careers',
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-[#E0E0E6] font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden relative">
      <SEOHead
        title="404 Not Found • Lost in the Milky Way"
        description="The page you are looking for does not exist on Eternal."
        noindex={true}
      />
      {/* Background Starfield Ambient Highlights */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-purple-600/10 blur-[130px]" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-pink-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-indigo-600/10 blur-[150px]" />
      </div>

      {/* Universal Top Navigation */}
      <PrivacyNavbar />

      {/* Main 404 Split Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-32 sm:pt-36 pb-20 w-full flex-1 flex items-center justify-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
          {/* LEFT COLUMN: Narrative Story & Clean Blue Links */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              <Sparkles
                className="w-3.5 h-3.5 text-purple-400 animate-spin"
                style={{ animationDuration: '6s' }}
              />
              <span>{t.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-5 uppercase leading-tight font-display">
              <span className="bg-gradient-to-r from-[#818CF8] via-[#C084FC] to-[#F472B6] bg-clip-text text-transparent drop-shadow-sm">
                {t.title}
              </span>
            </h1>

            {/* Narrative Story Description */}
            <p className="text-base sm:text-lg text-neutral-300 font-normal leading-relaxed mb-7 max-w-xl">
              {t.subtitle}
            </p>

            {/* Clean Uniform Blue Link List */}
            <div className="flex flex-col gap-3 mb-9 w-full max-w-md">
              <Link
                to="/safety"
                className="text-base font-semibold text-[#00aff4] hover:text-[#7DD3FC] underline underline-offset-4 decoration-1 decoration-[#00aff4]/40 hover:decoration-[#7DD3FC] transition-colors w-fit"
              >
                {t.statusPage}
              </Link>

              <a
                href="https://x.com/theeternalnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-[#00aff4] hover:text-[#7DD3FC] underline underline-offset-4 decoration-1 decoration-[#00aff4]/40 hover:decoration-[#7DD3FC] transition-colors w-fit"
              >
                {t.twitterLink}
              </a>

              <Link
                to="/safety"
                className="text-base font-semibold text-[#00aff4] hover:text-[#7DD3FC] underline underline-offset-4 decoration-1 decoration-[#00aff4]/40 hover:decoration-[#7DD3FC] transition-colors w-fit"
              >
                {t.supportLink}
              </Link>

              <Link
                to="/terms"
                className="text-base font-semibold text-[#00aff4] hover:text-[#7DD3FC] underline underline-offset-4 decoration-1 decoration-[#00aff4]/40 hover:decoration-[#7DD3FC] transition-colors w-fit"
              >
                {t.termsLink}
              </Link>

              <Link
                to="/careers"
                className="text-base font-semibold text-[#00aff4] hover:text-[#7DD3FC] underline underline-offset-4 decoration-1 decoration-[#00aff4]/40 hover:decoration-[#7DD3FC] transition-colors w-fit"
              >
                {t.careersLink}
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backBtn}</span>
              </button>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all hover:scale-105 active:scale-95"
                  >
                    <Home className="w-4 h-4" />
                    <span>{t.primaryActionAuth}</span>
                  </Link>
                  <Link
                    to="/messages"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#5822b4]/80 hover:bg-[#5822b4] text-white font-bold text-sm border border-purple-500/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-300" />
                    <span>{t.secondaryActionAuth}</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm shadow-[0_0_30px_rgba(236,72,153,0.35)] transition-all hover:scale-105 active:scale-95"
                  >
                    <Home className="w-4 h-4" />
                    <span>{t.primaryActionGuest}</span>
                  </Link>
                  <Link
                    to="/download"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/15 transition-all hover:scale-105 active:scale-95"
                  >
                    <Download className="w-4 h-4 text-pink-300" />
                    <span>{t.secondaryActionGuest}</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: 3D Pixar-Style Robot Mascot on the Milky Way */}
          <div className="lg:col-span-6 flex items-center justify-center relative">
            <NotFoundMilkyWayMascot className="w-full max-w-[580px]" />
          </div>
        </div>
      </main>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default NotFoundPage;
