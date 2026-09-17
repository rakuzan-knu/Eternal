export type DetectedOS = 'windows' | 'macos' | 'linux' | 'ios' | 'android';

export function detectUserOS(): DetectedOS {
  if (typeof window === 'undefined' || !navigator) return 'windows';
  const userAgent = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || (navigator as any).platform || '';

  if (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  if (/Android/.test(userAgent)) {
    return 'android';
  }
  if (/Mac|Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent) || /Mac/.test(platform)) {
    return 'macos';
  }
  if (/Linux/.test(userAgent) || /Linux/.test(platform)) {
    return 'linux';
  }
  return 'windows';
}

export interface DownloadTranslations {
  heroTitle: string;
  heroSubtitle: string;
  downloadForWindows: string;
  downloadForMac: string;
  downloadForLinux: string;
  downloadOnAppStore: string;
  getOnGooglePlay: string;
  desktopSectionHeading: string;
  desktopSectionSubtitle: string;
  macosButton: string;
  windowsButton: string;
  linuxButton: string;
  mobileSectionHeading: string;
  mobileSectionSubtitle: string;
  appStoreButton: string;
  googlePlayButton: string;
  downloadSimulatedNotice: string;
}

export const DOWNLOAD_TRANSLATIONS: Record<string, DownloadTranslations> = {
  English: {
    heroTitle: 'DOWNLOAD ETERNAL WHEREVER YOU HANG OUT',
    heroSubtitle:
      'Talk, play, and hang out with friends around the world over voice, video, or text. Available on Windows, macOS, Linux, iOS, Android, and consoles.',
    downloadForWindows: 'Download for Windows',
    downloadForMac: 'Download for macOS',
    downloadForLinux: 'Download for Linux',
    downloadOnAppStore: 'Download on App Store',
    getOnGooglePlay: 'Get it on Google Play',
    desktopSectionHeading: 'DOWNLOAD FOR DESKTOP',
    desktopSectionSubtitle:
      'Use Eternal to easily talk while playing your favorite PC games, show what you’re playing as your status, and stream your games to your friends.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'DOWNLOAD FOR MOBILE',
    mobileSectionSubtitle:
      'Out and about? Sunk in a massive beanbag? Bring Eternal with you and chat whenever, have fun with friends, or just see what’s up.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
    downloadSimulatedNotice: 'Downloading the latest Eternal installer package for your device...',
  },
  Українська: {
    heroTitle: 'ЗАВАНТАЖУЙ ETERNAL ДЛЯ БУДЬ-ЯКИХ ПРИСТРОЇВ',
    heroSubtitle:
      'Спілкуйтеся, грайте та проводьте час із друзями по всьому світу через аудіо, відео та текст. Доступно для Windows, macOS, Linux, iOS та Android.',
    downloadForWindows: 'Завантажити для Windows',
    downloadForMac: 'Завантажити для macOS',
    downloadForLinux: 'Завантажити для Linux',
    downloadOnAppStore: 'Завантажити в App Store',
    getOnGooglePlay: 'Завантажити в Google Play',
    desktopSectionHeading: 'ЗАВАНТАЖИТИ ДЛЯ КОМП’ЮТЕРА',
    desktopSectionSubtitle:
      'Використовуйте Eternal, щоб легко спілкуватися під час гри в улюблені комп’ютерні ігри, ділитися стрімами та показувати друзям свій статус.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'ЗАВАНТАЖИТИ ДЛЯ ТЕЛЕФОНУ',
    mobileSectionSubtitle:
      'У дорозі чи відпочиваєте на дивані? Беріть Eternal із собою, щоб спілкуватися в чатах, обмінюватися враженнями та завжди бути на зв’язку.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
    downloadSimulatedNotice: 'Завантаження інсталятора Eternal для вашої системи...',
  },
  Deutsch: {
    heroTitle: 'LADE ETERNAL HERUNTER, WO IMMER DU BIST',
    heroSubtitle:
      'Sprecht, spielt und verbringt Zeit mit Freunden weltweit über Sprache, Video oder Text.',
    downloadForWindows: 'Für Windows herunterladen',
    downloadForMac: 'Für macOS herunterladen',
    downloadForLinux: 'Für Linux herunterladen',
    downloadOnAppStore: 'Im App Store laden',
    getOnGooglePlay: 'Bei Google Play laden',
    desktopSectionHeading: 'FÜR DESKTOP HERUNTERLADEN',
    desktopSectionSubtitle:
      'Nutze Eternal, um beim Spielen mit Freunden zu sprechen und Bildschirme zu teilen.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'FÜR MOBILE HERUNTERLADEN',
    mobileSectionSubtitle:
      'Nimm Eternal überallhin mit und bleibe mit deiner Community in Kontakt.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
    downloadSimulatedNotice: 'Herunterladen des Eternal-Installers...',
  },
  Español: {
    heroTitle: 'DESCARGA ETERNAL DONDEQUIERA QUE ESTÉS',
    heroSubtitle:
      'Habla, juega y pasa el rato con tus amigos de todo el mundo mediante voz, video o texto.',
    downloadForWindows: 'Descargar para Windows',
    downloadForMac: 'Descargar para macOS',
    downloadForLinux: 'Descargar para Linux',
    downloadOnAppStore: 'Descargar en App Store',
    getOnGooglePlay: 'Disponible en Google Play',
    desktopSectionHeading: 'DESCARGA PARA ESCRITORIO',
    desktopSectionSubtitle:
      'Usa Eternal para hablar con facilidad mientras juegas a tus juegos de PC favoritos.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'DESCARGA PARA MÓVIL',
    mobileSectionSubtitle: 'Lleva Eternal contigo y chatea en cualquier momento con tus amigos.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
    downloadSimulatedNotice: 'Descargando el instalador oficial de Eternal...',
  },
  Français: {
    heroTitle: 'TÉLÉCHARGEZ ETERNAL OÙ QUE VOUS SOYEZ',
    heroSubtitle: 'Discutez, jouez et retrouvez vos amis du monde entier en vocal, vidéo ou texte.',
    downloadForWindows: 'Télécharger pour Windows',
    downloadForMac: 'Télécharger pour macOS',
    downloadForLinux: 'Télécharger pour Linux',
    downloadOnAppStore: 'Télécharger dans l’App Store',
    getOnGooglePlay: 'Disponible sur Google Play',
    desktopSectionHeading: 'TÉLÉCHARGER POUR ORDINATEUR',
    desktopSectionSubtitle:
      'Utilisez Eternal pour échanger facilement pendant vos sessions de jeu.',
    macosButton: 'macOS',
    windowsButton: 'Windows',
    linuxButton: 'Linux',
    mobileSectionHeading: 'TÉLÉCHARGER POUR MOBILE',
    mobileSectionSubtitle: 'Emportez Eternal partout avec vous et restez connecté avec vos amis.',
    appStoreButton: 'App Store',
    googlePlayButton: 'Google Play',
    downloadSimulatedNotice: 'Téléchargement de l’installateur Eternal...',
  },
};

/**
 * Triggers a simulated installer download
 */
export function triggerInstallerDownload(filename: string) {
  const dummyContent = `# Eternal Desktop / Mobile Installer\nPackage: ${filename}\nVersion: 2.4.0\nStatus: Official Build\n`;
  const blob = new Blob([dummyContent], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
