export interface DownloadTranslations {
  openWebApp: string;
  nativeUnavailable: string;
  unavailableLabel: string;
  previewLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  desktopSectionHeading: string;
  desktopSectionSubtitle: string;
  macosButton: string;
  windowsButton: string;
  linuxButton: string;
  mobileSectionHeading: string;
  mobileSectionSubtitle: string;
  appStoreButton: string;
  googlePlayButton: string;
}

export const DOWNLOAD_TRANSLATIONS: Record<string, DownloadTranslations> = {
  English: {
    previewLabel: 'Interface preview',
    unavailableLabel: 'Not available yet',
    nativeUnavailable:
      'Native apps are not available to download yet. Use Eternal in your browser today.',
    openWebApp: 'Open Eternal in your browser',
    heroTitle: 'ETERNAL IN YOUR BROWSER',
    heroSubtitle: 'Connect with friends using Eternal on the web. No installer required.',
    desktopSectionHeading: 'DESKTOP APPS',
    desktopSectionSubtitle:
      'Desktop installers are not available yet. You can use the web app on your computer.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'MOBILE APPS',
    mobileSectionSubtitle:
      'App Store and Google Play releases are not available yet. Use Eternal in your mobile browser.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
  },
  Українська: {
    previewLabel: 'Приклад інтерфейсу',
    unavailableLabel: 'Ще недоступно',
    nativeUnavailable:
      'Застосунки ще недоступні для завантаження. Користуйтеся Eternal у браузері.',
    openWebApp: 'Відкрити Eternal у браузері',
    heroTitle: 'ETERNAL У ВАШОМУ БРАУЗЕРІ',
    heroSubtitle: 'Спілкуйтеся з друзями у вебверсії Eternal. Інсталятор не потрібен.',
    desktopSectionHeading: 'ЗАСТОСУНКИ ДЛЯ КОМП’ЮТЕРА',
    desktopSectionSubtitle: 'Інсталятори ще недоступні. Користуйтеся вебверсією на комп’ютері.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'МОБІЛЬНІ ЗАСТОСУНКИ',
    mobileSectionSubtitle:
      'Версії в App Store та Google Play ще недоступні. Користуйтеся Eternal у мобільному браузері.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
  },
  Deutsch: {
    previewLabel: 'Vorschau der Oberfläche',
    unavailableLabel: 'Noch nicht verfügbar',
    nativeUnavailable:
      'Native Apps sind noch nicht zum Download verfügbar. Nutze Eternal jetzt im Browser.',
    openWebApp: 'Eternal im Browser öffnen',
    heroTitle: 'ETERNAL IN DEINEM BROWSER',
    heroSubtitle:
      'Bleibe mit Freunden über Eternal im Web in Kontakt. Keine Installation erforderlich.',
    desktopSectionHeading: 'DESKTOP-APPS',
    desktopSectionSubtitle:
      'Desktop-Installer sind noch nicht verfügbar. Nutze die Web-App auf deinem Computer.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'MOBILE APPS',
    mobileSectionSubtitle:
      'Versionen im App Store und bei Google Play sind noch nicht verfügbar. Nutze Eternal im mobilen Browser.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
  },
  Español: {
    previewLabel: 'Vista previa de la interfaz',
    unavailableLabel: 'Aún no disponible',
    nativeUnavailable:
      'Las aplicaciones nativas aún no están disponibles para descargar. Usa Eternal en tu navegador.',
    openWebApp: 'Abrir Eternal en el navegador',
    heroTitle: 'ETERNAL EN TU NAVEGADOR',
    heroSubtitle: 'Conecta con tus amigos en Eternal desde la web. No necesitas instalar nada.',
    desktopSectionHeading: 'APLICACIONES DE ESCRITORIO',
    desktopSectionSubtitle:
      'Los instaladores aún no están disponibles. Usa la aplicación web en tu ordenador.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'APLICACIONES MÓVILES',
    mobileSectionSubtitle:
      'Las versiones de App Store y Google Play aún no están disponibles. Usa Eternal en tu navegador móvil.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
  },
  Français: {
    previewLabel: 'Aperçu de l’interface',
    unavailableLabel: 'Pas encore disponible',
    nativeUnavailable:
      'Les applications natives ne sont pas encore disponibles au téléchargement. Utilisez Eternal dans votre navigateur.',
    openWebApp: 'Ouvrir Eternal dans le navigateur',
    heroTitle: 'ETERNAL DANS VOTRE NAVIGATEUR',
    heroSubtitle: 'Retrouvez vos amis sur Eternal sur le Web. Aucune installation nécessaire.',
    desktopSectionHeading: 'APPLICATIONS DE BUREAU',
    desktopSectionSubtitle:
      'Les programmes d’installation ne sont pas encore disponibles. Utilisez l’application Web sur votre ordinateur.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'APPLICATIONS MOBILES',
    mobileSectionSubtitle:
      'Les versions App Store et Google Play ne sont pas encore disponibles. Utilisez Eternal dans votre navigateur mobile.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
  },
};
