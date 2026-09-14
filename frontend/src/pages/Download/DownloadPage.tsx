import React, { useState, useEffect } from 'react';
import { Download, Apple, CheckCircle2 } from 'lucide-react';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { SEOHead } from '../../shared/seo';
import {
  detectUserOS,
  DetectedOS,
  DOWNLOAD_TRANSLATIONS,
  triggerInstallerDownload,
} from './data/downloadData';
import { EternalCoin3D } from '../Company/ui/CompanyIllustrations';
import { DownloadHeroPreview } from './ui/DownloadHeroPreview';
import { DownloadDesktopSection } from './ui/DownloadDesktopSection';
import { DownloadMobileSection } from './ui/DownloadMobileSection';

export const DownloadPage: React.FC = () => {
  const { currentLanguage } = useLanguageStore();
  const t = DOWNLOAD_TRANSLATIONS[currentLanguage] || DOWNLOAD_TRANSLATIONS.English;

  const [detectedOS, setDetectedOS] = useState<DetectedOS>('windows');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [scrollParallax, setScrollParallax] = useState(0);

  useEffect(() => {
    setDetectedOS(detectUserOS());

    const handleScroll = () => {
      setScrollParallax(Math.min(window.scrollY * 0.08, 45));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showDownloadToast = (pkgName: string) => {
    setDownloadToast(pkgName);
    setTimeout(() => {
      setDownloadToast(null);
    }, 4000);
  };

  const handleHeroDownload = () => {
    let filename = 'eternal-setup-x64.exe';
    if (detectedOS === 'macos') filename = 'eternal-macos-universal.dmg';
    if (detectedOS === 'linux') filename = 'eternal_amd64.deb';
    if (detectedOS === 'ios') filename = 'eternal-ios.ipa';
    if (detectedOS === 'android') filename = 'eternal-android.apk';

    triggerInstallerDownload(filename);
    showDownloadToast(filename);
  };

  const renderHeroButtonContent = () => {
    switch (detectedOS) {
      case 'macos':
        return (
          <>
            <Apple size={18} className="fill-white" />
            <span>{t.downloadForMac}</span>
          </>
        );
      case 'linux':
        return (
          <>
            {/* Linux Icon */}
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 0C8.686 0 6 2.686 6 6c0 1.15.32 2.227.875 3.146C5.748 10.237 5 11.776 5 13.5c0 2.485 1.515 4.5 3.5 4.5.31 0 .612-.05.902-.137C10.02 18.57 10.98 19 12 19s1.98-.43 2.598-1.137c.29.087.592.137.902.137 1.985 0 3.5-2.015 3.5-4.5 0-1.724-.748-3.263-1.875-4.354C17.68 8.227 18 7.15 18 6c0-3.314-2.686-6-6-6z" />
            </svg>
            <span>{t.downloadForLinux}</span>
          </>
        );
      case 'ios':
        return (
          <>
            <Apple size={18} className="fill-white" />
            <span>{t.downloadOnAppStore}</span>
          </>
        );
      case 'android':
        return (
          <>
            {/* Android / Google Play Icon */}
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.61-.914V2.728c0-.341.137-.667.61-.914zM15.207 13.414l2.457 2.457-11.455 6.612 8.998-9.069zm0-2.828L6.209 1.517l11.455 6.612-2.457 2.457zm1.414 1.414l3.568 2.06c.725.419.725 1.101 0 1.52l-3.568 2.06-2.121-2.121 2.121-3.519z" />
            </svg>
            <span>{t.getOnGooglePlay}</span>
          </>
        );
      case 'windows':
      default:
        return (
          <>
            <Download size={18} />
            <span>{t.downloadForWindows}</span>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden">
      <SEOHead
        title={t.heroTitle || 'Download Eternal'}
        description={t.heroSubtitle}
        canonical="/download"
        structuredData={{
          type: 'SoftwareApplication',
          name: 'Eternal Desktop & Mobile',
          operatingSystem: 'Windows, macOS, Linux, iOS, Android',
          applicationCategory: 'SocialNetworkingApplication',
          breadcrumbs: [{ name: 'Download Eternal', url: '/download' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* Floating Download Toast Feedback */}
      {downloadToast && (
        <div className="fixed bottom-8 right-8 z-50 p-4 rounded-2xl bg-[#5822b4] text-white shadow-2xl border border-purple-400/40 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs">Downloading installer...</span>
            <span className="text-[11px] text-purple-200 font-mono">{downloadToast}</span>
          </div>
        </div>
      )}

      {/* 1. Hero Section (Deep Indigo/Purple Discord Style with Smart OS Button) */}
      <section className="relative pt-36 pb-20 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-purple-600/25 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          {/* Top-Left Floating 3D Eternal Coin */}
          <div
            className="hidden md:block absolute -left-8 lg:left-4 top-2 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax}px)` }}
          >
            <EternalCoin3D className="w-32 h-32 lg:w-40 lg:h-40" animated={true} />
          </div>

          {/* Hero Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight uppercase mb-6 drop-shadow-2xl max-w-5xl leading-tight">
            {t.heroTitle}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-neutral-200/90 max-w-3xl leading-relaxed mb-10 font-medium">
            {t.heroSubtitle}
          </p>

          {/* Center Smart OS Detection Call-to-Action Button */}
          <button
            type="button"
            onClick={handleHeroDownload}
            className="px-9 py-4 rounded-full bg-[#5822b4] hover:bg-[#6b2bd8] text-white text-sm font-black tracking-wide shadow-[0_0_35px_rgba(88,34,180,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer mb-12"
          >
            {renderHeroButtonContent()}
          </button>

          {/* Desktop & Mobile Companion Live Preview */}
          <DownloadHeroPreview />
        </div>
      </section>

      {/* 2. DOWNLOAD FOR DESKTOP Section (Windows x64/ARM64, Linux deb/tar/rpm/pkg dropdowns) */}
      <DownloadDesktopSection
        heading={t.desktopSectionHeading}
        subtitle={t.desktopSectionSubtitle}
        macosLabel={t.macosButton}
        windowsLabel={t.windowsButton}
        linuxLabel={t.linuxButton}
        onDownloadNotice={showDownloadToast}
      />

      {/* 3. DOWNLOAD FOR MOBILE Section (Phone Mockup + App Store / Google Play) */}
      <DownloadMobileSection
        heading={t.mobileSectionHeading}
        subtitle={t.mobileSectionSubtitle}
        appStoreLabel={t.appStoreButton}
        googlePlayLabel={t.googlePlayButton}
        onDownloadNotice={showDownloadToast}
      />

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default DownloadPage;
