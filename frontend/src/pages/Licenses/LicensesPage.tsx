import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { LICENSES_DATA, FONTS_DATA, LicenseGroup, FontsLicenseSection } from './data/licensesData';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import {
  ExternalLink,
  Search,
  Copy,
  Check,
  FileCode2,
  Sparkles,
  Type,
  Code2,
  X,
} from 'lucide-react';

const TRANSLATIONS: Record<
  string,
  {
    title: string;
    subtitle: string;
    introTitle: string;
    subheading: string;
    disclaimer: string;
    includedIntro: string;
    downloadIntro: string;
    licenseNotice: string;
    fontsTitle: string;
    fontsSubtitle: string;
    fontsNotice: string;
    searchPlaceholder: string;
    all: string;
    fontsTab: string;
    copied: string;
    copy: string;
    noResults: string;
  }
> = {
  English: {
    title: 'Licenses',
    subtitle: 'These are the licenses for the libraries we use:',
    introTitle: 'Licenses for OSS used in Eternal are reproduced below',
    subheading: 'Software used in Eternal for Windows, Mac, Web and Mobile',
    disclaimer:
      'THE FOLLOWING SETS FORTH ATTRIBUTION NOTICES FOR THIRD PARTY SOFTWARE THAT MAY BE CONTAINED IN PORTIONS OF THE ETERNAL PRODUCT.',
    includedIntro: 'The following software may be included in this product:',
    downloadIntro: 'A copy of the source code may be downloaded from',
    licenseNotice: 'This software contains the following license and notice below:',
    fontsTitle: 'Fonts',
    fontsSubtitle: 'The following open source fonts are included in this product:',
    fontsNotice:
      'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is copied below, and is also available with a FAQ at: https://openfontlicense.org/',
    searchPlaceholder: 'Search licensed software, fonts, or package name...',
    all: 'All Licenses',
    fontsTab: 'Fonts (OFL 1.1)',
    copied: 'Copied!',
    copy: 'Copy License',
    noResults: 'No packages or fonts found matching your search query.',
  },
  Українська: {
    title: 'Ліцензії',
    subtitle: 'Ось ліцензії на бібліотеки та шрифти, які ми використовуємо:',
    introTitle: 'Ліцензії для відкритого коду (OSS) в Eternal наведені нижче',
    subheading:
      'Програмне забезпечення, що використовується в Eternal для Windows, Mac, Web та Mobile',
    disclaimer:
      'НИЖЧЕ НАВЕДЕНО ПОВІДОМЛЕННЯ ПРО АВТОРСЬКІ ПРАВА ДЛЯ СТОРОННЬОГО ПРОГРАМНОГО ЗАБЕЗПЕЧЕННЯ, ЩО МІСТИТЬСЯ В ETERNAL.',
    includedIntro: 'Наступне програмне забезпечення може бути включене до цього продукту:',
    downloadIntro: 'Копію вихідного коду можна завантажити за посиланнями:',
    licenseNotice: 'Це програмне забезпечення містить наступну ліцензію та повідомлення:',
    fontsTitle: 'Шрифти (Fonts)',
    fontsSubtitle: 'Наступні шрифти з відкритим вихідним кодом включені до цього продукту:',
    fontsNotice:
      'Це шрифтове програмне забезпечення ліцензовано згідно з SIL Open Font License, версія 1.1. Текст ліцензії наведено нижче, а також доступний разом із FAQ за адресою: https://openfontlicense.org/',
    searchPlaceholder: 'Пошук бібліотеки, шрифтів або назви пакета...',
    all: 'Всі ліцензії',
    fontsTab: 'Шрифти (OFL 1.1)',
    copied: 'Скопійовано!',
    copy: 'Копіювати текст ліцензії',
    noResults: 'Пакетів або шрифтів за вашим запитом не знайдено.',
  },
  Deutsch: {
    title: 'Lizenzen',
    subtitle: 'Dies sind die Lizenzen für die von uns verwendeten Bibliotheken und Schriftarten:',
    introTitle: 'Open-Source-Lizenzen für Eternal',
    subheading: 'Verwendete Software in Eternal für Windows, Mac, Web und Mobile',
    disclaimer: 'HINWEISE ZU URHEBERRECHTEN VON DRITTANBIETERN IM ETERNAL-PRODUKT.',
    includedIntro: 'Folgende Software ist im Produkt enthalten:',
    downloadIntro: 'Der Quellcode kann hier heruntergeladen werden:',
    licenseNotice: 'Diese Software enthält die folgende Lizenz und Erklärung:',
    fontsTitle: 'Schriftarten (Fonts)',
    fontsSubtitle: 'Folgende Open-Source-Schriftarten sind im Produkt enthalten:',
    fontsNotice: 'Diese Schriftartensoftware ist unter der SIL Open Font License lizenziert.',
    searchPlaceholder: 'Paket, Schriftart oder Lizenz suchen...',
    all: 'Alle Lizenzen',
    fontsTab: 'Schriftarten (OFL)',
    copied: 'Kopiert!',
    copy: 'Lizenz kopieren',
    noResults: 'Keine Pakete gefunden.',
  },
  Español: {
    title: 'Licencias',
    subtitle: 'Estas son las licencias de las librerías y fuentes que usamos:',
    introTitle: 'Licencias de software libre utilizadas en Eternal',
    subheading: 'Software utilizado en Eternal para Windows, Mac, Web y Móvil',
    disclaimer: 'AVISOS DE ATRIBUCIÓN DE TERCEROS PARA EL PRODUCTO ETERNAL.',
    includedIntro: 'El siguiente software puede estar incluido en este producto:',
    downloadIntro: 'Una copia del código fuente se puede descargar de:',
    licenseNotice: 'Este software contiene la siguiente licencia y aviso:',
    fontsTitle: 'Fuentes tipográficas (Fonts)',
    fontsSubtitle: 'Las siguientes fuentes de código abierto están incluidas en este producto:',
    fontsNotice: 'Este software tipográfico está bajo la licencia SIL Open Font License 1.1.',
    searchPlaceholder: 'Buscar librerías, fuentes o licencias...',
    all: 'Todas las licencias',
    fontsTab: 'Fuentes (OFL)',
    copied: '¡Copiado!',
    copy: 'Copiar licencia',
    noResults: 'No se encontraron paquetes.',
  },
  Français: {
    title: 'Licences',
    subtitle: 'Voici les licences des bibliothèques et polices que nous utilisons :',
    introTitle: 'Licences open source utilisées dans Eternal',
    subheading: 'Logiciels utilisés dans Eternal pour Windows, Mac, Web et Mobile',
    disclaimer: 'MENTIONS LÉGALES CONCERNANT LES LOGICIELS TIERS DANS ETERNAL.',
    includedIntro: 'Les logiciels suivants peuvent être inclus dans ce produit :',
    downloadIntro: 'Une copie du code source peut être téléchargée depuis :',
    licenseNotice: 'Ce logiciel contient la licence et l’avis ci-dessous :',
    fontsTitle: 'Polices de caractères (Fonts)',
    fontsSubtitle: 'Les polices open source suivantes sont incluses dans ce produit :',
    fontsNotice: 'Ce logiciel de police est sous licence SIL Open Font License 1.1.',
    searchPlaceholder: 'Rechercher un paquet, police ou licence...',
    all: 'Toutes les licences',
    fontsTab: 'Polices (OFL)',
    copied: 'Copié !',
    copy: 'Copier la licence',
    noResults: 'Aucun paquet trouvé.',
  },
};

export const LicensesPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.English;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [copiedLicense, setCopiedLicense] = useState<string | null>(null);

  const filterOptions = useMemo(() => ['All', 'MIT', 'Apache-2.0', 'ISC', 'BSD', 'Fonts'], []);

  const filteredLicenseGroups = useMemo(() => {
    if (selectedFilter === 'Fonts') return [];

    const query = searchQuery.trim().toLowerCase();

    return LICENSES_DATA.map((group) => {
      const matchesType = selectedFilter === 'All' || group.licenseShort === selectedFilter;

      if (!matchesType) return null;

      const matchingPackages = group.packages.filter((pkg) => {
        if (!query) return true;
        return (
          pkg.name.toLowerCase().includes(query) ||
          (pkg.copyright && pkg.copyright.toLowerCase().includes(query)) ||
          group.licenseName.toLowerCase().includes(query)
        );
      });

      if (query && matchingPackages.length === 0) {
        return null;
      }

      return {
        ...group,
        packages: matchingPackages,
      };
    }).filter(Boolean) as LicenseGroup[];
  }, [searchQuery, selectedFilter]);

  const filteredFonts = useMemo(() => {
    if (selectedFilter !== 'All' && selectedFilter !== 'Fonts') {
      return null;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return FONTS_DATA;

    const matching = FONTS_DATA.fonts.filter((f) => {
      return (
        f.fontName.toLowerCase().includes(query) ||
        f.author.toLowerCase().includes(query) ||
        f.copyright.toLowerCase().includes(query) ||
        query.includes('font') ||
        query.includes('ofl') ||
        query.includes('sil')
      );
    });

    if (matching.length === 0) return null;

    return {
      ...FONTS_DATA,
      fonts: matching,
    };
  }, [searchQuery, selectedFilter]);

  const handleCopyLicense = (name: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLicense(name);
    setTimeout(() => {
      setCopiedLicense(null);
    }, 2000);
  };

  const hasAnyResults = filteredLicenseGroups.length > 0 || filteredFonts !== null;

  return (
    <div className="min-h-screen bg-[#07050f] text-[#E0E0E6] font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between">
      <SEOHead
        title={t.title || 'Open Source Licenses'}
        description={t.subtitle}
        canonical="/licenses"
        structuredData={{
          breadcrumbs: [{ name: 'Licenses', url: '/licenses' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Hero Header Area */}
      <section className="pt-32 pb-8 px-6 lg:px-12 max-w-5xl mx-auto w-full select-text">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-3">
          {t.title}
        </h1>
        <p className="text-base sm:text-lg text-neutral-300 mb-6">{t.subtitle}</p>

        <div className="p-6 rounded-3xl bg-[#0e0a1f]/80 border border-purple-800/30 backdrop-blur-xl shadow-2xl flex flex-col gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t.introTitle}
          </h2>
          <h3 className="text-sm sm:text-base font-semibold text-purple-300">{t.subheading}</h3>
          <p className="text-xs sm:text-[13px] text-neutral-400 font-mono tracking-wide uppercase leading-relaxed border-t border-purple-800/30 pt-3">
            {t.disclaimer}
          </p>
        </div>
      </section>

      {/* Main Content Layout (Clean, Wide, No Left Sidebar) */}
      <main className="max-w-5xl mx-auto px-6 lg:px-12 py-6 w-full flex-1 flex flex-col gap-8 select-text">
        {/* Search and Quick Filters Bar */}
        <div className="p-4 rounded-2xl bg-[#0e0a1f]/80 border border-purple-800/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#130d2a] border border-purple-800/40 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick License Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-0.5">
            {filterOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedFilter === type
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-purple-950/40 text-neutral-400 hover:text-white hover:bg-purple-900/30 border border-purple-800/30'
                }`}
              >
                {type === 'All' ? t.all : type === 'Fonts' ? t.fontsTab : type}
              </button>
            ))}
          </div>
        </div>

        {/* License Groups & Fonts Rendering */}
        {!hasAnyResults ? (
          <div className="p-12 rounded-3xl bg-[#0e0a1f]/40 border border-purple-800/20 text-center flex flex-col items-center justify-center text-neutral-400">
            <FileCode2 className="w-12 h-12 text-purple-400/40 mb-3" />
            <p className="text-base font-semibold">{t.noResults}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {/* 1. Software Libraries by License Group */}
            {filteredLicenseGroups.map((group) => (
              <section
                key={group.licenseName}
                className="p-6 sm:p-8 rounded-3xl bg-[#0e0a1f]/60 border border-purple-800/30 backdrop-blur-sm shadow-xl flex flex-col gap-6"
              >
                {/* Header of License Group */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-purple-800/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-purple-950/80 border border-purple-800/40 text-purple-400">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {group.licenseName}
                      </h3>
                      <span className="text-xs text-neutral-400 font-mono">
                        {group.packages.length} packages under this license
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={group.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-xs font-bold text-purple-300 transition-all hover:text-white"
                      title="View Official OSI License"
                    >
                      <span>Official License</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLicense(group.licenseName, group.licenseText)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-xs font-bold text-purple-200 transition-all active:scale-95"
                      title="Copy full license text"
                    >
                      {copiedLicense === group.licenseName ? (
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
                </div>

                {/* Discord-style Software Packages Listing */}
                <div className="flex flex-col gap-4 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  <p>
                    <span className="font-semibold text-white">{t.includedIntro}</span>{' '}
                    {group.packages.map((pkg, idx) => (
                      <React.Fragment key={pkg.name}>
                        <span className="font-mono font-bold text-purple-300">{pkg.name}</span>
                        {idx < group.packages.length - 1 && ', '}
                      </React.Fragment>
                    ))}
                    .
                  </p>

                  <p>
                    <span className="font-semibold text-white">{t.downloadIntro}:</span>{' '}
                    {group.packages.map((pkg, idx) => (
                      <React.Fragment key={pkg.name}>
                        <a
                          href={pkg.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-purple-400 hover:text-purple-200 underline transition-colors"
                        >
                          {pkg.repoUrl}
                        </a>{' '}
                        ({pkg.name}){idx < group.packages.length - 1 && ', '}
                      </React.Fragment>
                    ))}
                    .
                  </p>

                  <p className="font-semibold text-white">{t.licenseNotice}</p>
                </div>

                {/* Verbatim License Text Box */}
                <div className="p-5 rounded-2xl bg-[#090615] border border-purple-900/40 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed overflow-x-auto custom-scrollbar select-text shadow-inner">
                  {group.licenseText}
                </div>
              </section>
            ))}

            {/* 2. Open Source Fonts Section (SIL Open Font License 1.1) */}
            {filteredFonts && (
              <section className="p-6 sm:p-8 rounded-3xl bg-[#0e0a1f]/60 border border-purple-800/30 backdrop-blur-sm shadow-xl flex flex-col gap-6">
                {/* Header of Fonts Group */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-purple-800/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-purple-950/80 border border-purple-800/40 text-purple-400">
                      <Type className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {t.fontsTitle}
                      </h3>
                      <span className="text-xs text-neutral-400 font-mono">
                        {filteredFonts.licenseName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={filteredFonts.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-xs font-bold text-purple-300 transition-all hover:text-white"
                      title="View Official OFL FAQ & License"
                    >
                      <span>OFL FAQ</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLicense('OFL-1.1', filteredFonts.licenseText)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-xs font-bold text-purple-200 transition-all active:scale-95"
                      title="Copy full SIL OFL license text"
                    >
                      {copiedLicense === 'OFL-1.1' ? (
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
                </div>

                {/* Discord-style Fonts Listing */}
                <div className="flex flex-col gap-5 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  <p className="font-semibold text-white">{t.fontsSubtitle}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredFonts.fonts.map((f) => (
                      <div
                        key={f.fontName}
                        className="p-4 rounded-2xl bg-[#140e2e]/50 border border-purple-800/30 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-base text-white">{f.fontName}</span>
                          <a
                            href={f.repoUrl || f.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-purple-400 hover:text-white hover:bg-purple-800/40 transition-colors"
                            title={`Open ${f.fontName} repository`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <span className="text-xs text-neutral-400">{f.author}</span>
                        <a
                          href={f.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-purple-400 hover:text-purple-300 truncate"
                        >
                          {f.websiteUrl}
                        </a>
                        <p className="text-[11px] text-neutral-400/90 font-mono mt-0.5">
                          {f.copyright}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono">
                          Portions Copyright 2026 Eternal Inc.
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-neutral-300 font-medium pt-2 border-t border-purple-800/30">
                    {t.fontsNotice}
                  </p>
                </div>

                {/* Verbatim SIL OFL 1.1 License Text Box */}
                <div className="p-5 rounded-2xl bg-[#090615] border border-purple-900/40 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed overflow-x-auto custom-scrollbar select-text shadow-inner">
                  {filteredFonts.licenseText}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default LicensesPage;
