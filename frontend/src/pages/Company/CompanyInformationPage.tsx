import React, { useState } from 'react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import { MapPin, Mail, Users, Copy, Check } from 'lucide-react';

interface CompanyTranslations {
  title: string;
  subtitle: string;
  companyName: string;
  addressLabel: string;
  address: string;
  cityCountry: string;
  emailLabel: string;
  email: string;
  supportHelpLabel: string;
  supportHelpText: string;
  ownersLabel: string;
  ownerRank: string;
  owners: string[];
  legalStatusLabel: string;
  legalStatusText: string;
  copied: string;
  copy: string;
}

const TRANSLATIONS: Record<string, CompanyTranslations> = {
  English: {
    title: 'Eternal Company Information – Impressum',
    subtitle: 'Legal details and corporate disclosures for the Eternal platform.',
    companyName: 'Eternal Inc.',
    addressLabel: 'Registered Location',
    address: 'Kyiv, Ukraine',
    cityCountry: 'Kyiv, Ukraine',
    emailLabel: 'Direct Email',
    email: 'support@eternal.app',
    supportHelpLabel: 'Customer Support',
    supportHelpText:
      'For user assistance, inquiries, or bug reports, please email our support team.',
    ownersLabel: 'Company Owners',
    ownerRank: 'Owner',
    owners: ['Nikolaj Agh', 'Mihal Agh', 'Ilya Podorozhnyi'],
    legalStatusLabel: 'Corporate Information',
    legalStatusText:
      'Eternal Inc. is an independent software and digital communication company based in Kyiv, Ukraine.',
    copied: 'Copied!',
    copy: 'Copy',
  },
  Українська: {
    title: 'Інформація про компанію Eternal – Impressum',
    subtitle: 'Юридичні відомості та корпоративна інформація про платформу Eternal.',
    companyName: 'Eternal Inc.',
    addressLabel: 'Місцезнаходження',
    address: 'Київ, Україна',
    cityCountry: 'м. Київ, Україна',
    emailLabel: 'Електронна пошта',
    email: 'support@eternal.app',
    supportHelpLabel: 'Служба підтримки',
    supportHelpText:
      'Для допомоги користувачам, запитів або повідомлень про помилки пишіть у нашу службу підтримки.',
    ownersLabel: 'Власники компанії',
    ownerRank: 'Власник',
    owners: ['Микола Аг', 'Міхал Аг', 'Ілля Подорожній'],
    legalStatusLabel: 'Корпоративна інформація',
    legalStatusText:
      'Eternal Inc. — незалежна компанія з розробки програмного забезпечення та цифрових комунікацій, розташована в м. Київ, Україна.',
    copied: 'Скопійовано!',
    copy: 'Копіювати',
  },
  Deutsch: {
    title: 'Eternal Unternehmensangaben – Impressum',
    subtitle: 'Rechtliche Angaben und Unternehmensinformationen für Eternal.',
    companyName: 'Eternal Inc.',
    addressLabel: 'Sitz der Gesellschaft',
    address: 'Kiew, Ukraine',
    cityCountry: 'Kiew, Ukraine',
    emailLabel: 'E-Mail',
    email: 'support@eternal.app',
    supportHelpLabel: 'Kundensupport',
    supportHelpText: 'Bei Fragen oder Support-Anliegen kontaktieren Sie bitte unseren Support.',
    ownersLabel: 'Unternehmensinhaber',
    ownerRank: 'Inhaber',
    owners: ['Nikolaj Agh', 'Mihal Agh', 'Ilya Podorozhnyi'],
    legalStatusLabel: 'Unternehmensstatus',
    legalStatusText:
      'Eternal Inc. ist ein unabhängiges Softwareunternehmen mit Sitz in Kiew, Ukraine.',
    copied: 'Kopiert!',
    copy: 'Kopieren',
  },
  Español: {
    title: 'Información de la empresa Eternal – Impressum',
    subtitle: 'Detalles legales e información corporativa de Eternal.',
    companyName: 'Eternal Inc.',
    addressLabel: 'Ubicación',
    address: 'Kiev, Ucrania',
    cityCountry: 'Kiev, Ucrania',
    emailLabel: 'Correo Electrónico',
    email: 'support@eternal.app',
    supportHelpLabel: 'Soporte al Cliente',
    supportHelpText: 'Para consultas y soporte, envíe un correo electrónico a nuestro equipo.',
    ownersLabel: 'Propietarios de la Empresa',
    ownerRank: 'Propietario',
    owners: ['Nikolaj Agh', 'Mihal Agh', 'Ilya Podorozhnyi'],
    legalStatusLabel: 'Información Corporativa',
    legalStatusText:
      'Eternal Inc. es una empresa de software y comunicación digital con sede en Kiev, Ucrania.',
    copied: '¡Copiado!',
    copy: 'Copiar',
  },
  Français: {
    title: "Informations sur l'entreprise Eternal – Impressum",
    subtitle: 'Informations juridiques et statut de la société Eternal.',
    companyName: 'Eternal Inc.',
    addressLabel: 'Siège social',
    address: 'Kiev, Ukraine',
    cityCountry: 'Kiev, Ukraine',
    emailLabel: 'E-mail',
    email: 'support@eternal.app',
    supportHelpLabel: 'Support Client',
    supportHelpText: 'Pour toute question ou assistance, contactez notre équipe par e-mail.',
    ownersLabel: 'Propriétaires de l’entreprise',
    ownerRank: 'Propriétaire',
    owners: ['Nikolaj Agh', 'Mihal Agh', 'Ilya Podorozhnyi'],
    legalStatusLabel: "Informations sur l'entreprise",
    legalStatusText:
      'Eternal Inc. est une entreprise de logiciels et de communications numériques basée à Kiev, Ukraine.',
    copied: 'Copié !',
    copy: 'Copier',
  },
};

export const CompanyInformationPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.English;
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@eternal.app');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-[#E0E0E6] font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between">
      <SEOHead
        title={t.title || 'Company Information & Impressum'}
        description={t.subtitle}
        canonical="/company-information"
        structuredData={{
          type: 'Organization',
          breadcrumbs: [{ name: 'Company Information', url: '/company-information' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 lg:px-12 pt-32 pb-16 w-full flex-1 flex flex-col gap-8 select-text">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3">
            {t.title}
          </h1>
          <p className="text-base sm:text-lg text-neutral-400">{t.subtitle}</p>
        </div>

        {/* Company Card Block (Discord Impressum Style) */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0e0a1f]/80 border border-purple-800/30 backdrop-blur-xl shadow-2xl flex flex-col gap-8">
          {/* Company Name Header without extra tags */}
          <div className="flex items-center gap-4 pb-6 border-b border-purple-800/30">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              E
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {t.companyName}
              </h2>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address */}
            <div className="p-5 rounded-2xl bg-[#140e2e]/50 border border-purple-800/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                <span>{t.addressLabel}</span>
              </div>
              <p className="text-lg font-bold text-white">{t.address}</p>
              <p className="text-xs text-neutral-400 font-mono">Eternal Inc., Kyiv, Ukraine</p>
            </div>

            {/* Email / Support */}
            <div className="p-5 rounded-2xl bg-[#140e2e]/50 border border-purple-800/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <Mail className="w-4 h-4" />
                  <span>{t.emailLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-300 hover:text-white transition-colors select-none"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>{t.copy}</span>
                    </>
                  )}
                </button>
              </div>
              <a
                href="mailto:support@eternal.app"
                className="text-lg font-bold text-purple-300 hover:text-purple-200 underline transition-colors"
              >
                support@eternal.app
              </a>
              <p className="text-xs text-neutral-400">{t.supportHelpText}</p>
            </div>
          </div>

          {/* Owners (Rank: Owner) */}
          <div className="p-6 rounded-2xl bg-[#140e2e]/50 border border-purple-800/30 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>{t.ownersLabel}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {t.owners.map((owner) => (
                <div
                  key={owner}
                  className="p-4 rounded-xl bg-[#090615] border border-purple-900/40 flex items-center gap-3 shadow-inner"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-700/40 flex items-center justify-center text-xs font-black text-purple-300 select-none">
                    {owner.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">{owner}</span>
                    <span className="text-[11px] text-purple-300 font-semibold">{t.ownerRank}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corporate / Legal Note */}
          <div className="pt-4 border-t border-purple-800/30 text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
            <p className="font-semibold text-white mb-1">{t.legalStatusLabel}</p>
            <p>{t.legalStatusText}</p>
          </div>
        </div>
      </main>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default CompanyInformationPage;
