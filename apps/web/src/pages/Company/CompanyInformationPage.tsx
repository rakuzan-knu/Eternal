import React from 'react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '@/widgets/footer';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import { MapPin, Mail, Users } from 'lucide-react';

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
}

const TRANSLATIONS: Record<string, CompanyTranslations> = {
  English: {
    title: 'Eternal Project Information',
    subtitle: 'Project details, founders, and legal status of the Eternal platform.',
    companyName: 'Eternal',
    addressLabel: 'Country',
    address: 'Ukraine',
    cityCountry: 'Ukraine',
    emailLabel: 'Direct Email',
    email: 'Contact address not provided',
    supportHelpLabel: 'Customer Support',
    supportHelpText:
      'A private support address has not been provided. Do not post personal data in public issues.',
    ownersLabel: 'Project Founders',
    ownerRank: 'Founder',
    owners: ['Ag Mykola', 'Ag Mihal'],
    legalStatusLabel: 'Project Status',
    legalStatusText:
      'Eternal is a software and digital communication project started in Ukraine by Ag Mykola and Ag Mihal. These are authorship credits. Complete legal operator details and a private contact address have not been provided; this page is not a complete legal notice.',
  },
  Українська: {
    title: 'Інформація про проєкт Eternal',
    subtitle: 'Відомості про проєкт Eternal, його засновників та юридичний статус.',
    companyName: 'Eternal',
    addressLabel: 'Країна',
    address: 'Україна',
    cityCountry: 'Україна',
    emailLabel: 'Електронна пошта',
    email: 'Контактну адресу не надано',
    supportHelpLabel: 'Служба підтримки',
    supportHelpText:
      'Приватну адресу підтримки не надано. Не публікуйте персональні дані у відкритих зверненнях.',
    ownersLabel: 'Засновники проєкту',
    ownerRank: 'Засновник',
    owners: ['Ag Mykola', 'Ag Mihal'],
    legalStatusLabel: 'Статус проєкту',
    legalStatusText:
      'Eternal — проєкт програмного забезпечення та цифрових комунікацій, започаткований в Україні засновниками Ag Mykola та Ag Mihal. Імена наведено як авторство. Повні юридичні реквізити операторів і приватний контакт не надано; ця сторінка не є повним юридичним повідомленням.',
  },
  Deutsch: {
    title: 'Eternal Projektinformationen',
    subtitle: 'Projektinformationen, Gründer und rechtlicher Status von Eternal.',
    companyName: 'Eternal',
    addressLabel: 'Land',
    address: 'Ukraine',
    cityCountry: 'Ukraine',
    emailLabel: 'E-Mail',
    email: 'Kontaktadresse nicht angegeben',
    supportHelpLabel: 'Kundensupport',
    supportHelpText:
      'Eine private Support-Adresse wurde nicht angegeben. Veröffentlichen Sie keine personenbezogenen Daten in öffentlichen Anfragen.',
    ownersLabel: 'Projektgründer',
    ownerRank: 'Gründer',
    owners: ['Ag Mykola', 'Ag Mihal'],
    legalStatusLabel: 'Projektstatus',
    legalStatusText:
      'Eternal ist ein von Ag Mykola und Ag Mihal in der Ukraine gestartetes Softwareprojekt. Die Namen nennen die Urheber. Vollständige rechtliche Betreiberangaben und eine private Kontaktadresse wurden nicht angegeben; diese Seite ist kein vollständiges Impressum.',
  },
  Español: {
    title: 'Información del proyecto Eternal',
    subtitle: 'Información del proyecto Eternal, sus fundadores y su situación jurídica.',
    companyName: 'Eternal',
    addressLabel: 'País',
    address: 'Ucrania',
    cityCountry: 'Ucrania',
    emailLabel: 'Correo Electrónico',
    email: 'Dirección de contacto no facilitada',
    supportHelpLabel: 'Soporte al Cliente',
    supportHelpText:
      'No se ha facilitado una dirección privada de soporte. No publique datos personales en consultas públicas.',
    ownersLabel: 'Fundadores del proyecto',
    ownerRank: 'Fundador',
    owners: ['Ag Mykola', 'Ag Mihal'],
    legalStatusLabel: 'Situación del proyecto',
    legalStatusText:
      'Eternal es un proyecto de software iniciado en Ucrania por Ag Mykola y Ag Mihal. Los nombres reconocen la autoría. No se han facilitado los datos legales completos del operador ni un contacto privado; esta página no es un aviso legal completo.',
  },
  Français: {
    title: 'Informations sur le projet Eternal',
    subtitle: 'Informations sur le projet Eternal, ses fondateurs et son statut juridique.',
    companyName: 'Eternal',
    addressLabel: 'Pays',
    address: 'Ukraine',
    cityCountry: 'Ukraine',
    emailLabel: 'E-mail',
    email: 'Adresse de contact non fournie',
    supportHelpLabel: 'Support Client',
    supportHelpText:
      'Aucune adresse privée de support n’a été fournie. Ne publiez pas de données personnelles dans les demandes publiques.',
    ownersLabel: 'Fondateurs du projet',
    ownerRank: 'Fondateur',
    owners: ['Ag Mykola', 'Ag Mihal'],
    legalStatusLabel: 'Statut du projet',
    legalStatusText:
      'Eternal est un projet logiciel lancé en Ukraine par Ag Mykola et Ag Mihal. Les noms reconnaissent les auteurs. Les coordonnées légales complètes des opérateurs et un contact privé n’ont pas été fournis ; cette page ne constitue pas des mentions légales complètes.',
  },
};

export const CompanyInformationPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.English;

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

        {/* Company Card Block */}
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
              <p className="text-xs text-neutral-400 font-mono">
                {t.companyName} • {t.cityCountry}
              </p>
            </div>

            {/* Email / Support */}
            <div className="p-5 rounded-2xl bg-[#140e2e]/50 border border-purple-800/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <Mail className="w-4 h-4" />
                  <span>{t.emailLabel}</span>
                </div>
              </div>
              <p className="text-lg font-bold text-white">{t.email}</p>
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
