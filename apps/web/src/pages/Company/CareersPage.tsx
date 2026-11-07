import { CAREERS_AVAILABILITY_TRANSLATIONS } from '@social-network/shared-content';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '@/widgets/footer';
import { SEOHead } from '@/shared/seo';
import { useLanguageStore } from '@/shared/lib/language/languageStore';

export const CareersPage = () => {
  const { currentLanguage } = useLanguageStore();
  const t =
    CAREERS_AVAILABILITY_TRANSLATIONS[currentLanguage] || CAREERS_AVAILABILITY_TRANSLATIONS.English;
  return (
    <div className="min-h-screen bg-[#07050f] text-white font-sans antialiased flex flex-col">
      <SEOHead title={t.title} description={t.message} canonical="/careers" />
      <PrivacyNavbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 pt-36 pb-20">
        <section className="rounded-3xl border border-purple-800/30 bg-[#0e0a1f]/80 p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{t.title}</h1>
          <p role="status" className="mt-5 text-neutral-300 leading-relaxed">
            {t.message}
          </p>
          <p className="mt-6 text-sm text-neutral-300">{t.contact}:</p>
          <a
            className="mt-2 inline-block text-purple-300 underline underline-offset-4 break-all"
            href="mailto:eternalnet.support@proton.me"
          >
            eternalnet.support@proton.me
          </a>
        </section>
      </main>
      <EternalFooter />
    </div>
  );
};

export default CareersPage;
