import type { Configuration } from 'electron-builder';
import { distributionSchema } from './src/shared/distribution.ts';
import { microsoftStoreIdentity, snapName, storeRegistration } from './scripts/store-config.ts';

const distribution = distributionSchema.parse(
  process.env.ETERNAL_DESKTOP_DISTRIBUTION ??
    (process.platform === 'win32' ? 'nsis' : process.platform === 'darwin' ? 'dmg' : 'AppImage'),
);

const config: Configuration = {
  appId: 'com.eternal.desktop',
  productName: 'Eternal',
  executableName:
    distribution === 'snap'
      ? snapName(process.env.ETERNAL_DESKTOP_SNAP_NAME || undefined)
      : 'eternal',
  copyright: 'Copyright © Eternal',
  extraMetadata: {
    description: 'Eternal desktop social application',
    homepage: 'https://eternalnet.vercel.app',
    author: { name: 'Eternal' },
    eternalDistribution: distribution,
  },
  artifactName: 'Eternal-${version}-${os}-${arch}.${ext}',
  publish: [
    {
      provider: 'github',
      owner: 'rakuzan-knu',
      repo: 'Eternal',
      channel: process.env.ETERNAL_DESKTOP_UPDATE_CHANNEL === 'beta' ? 'beta' : 'latest',
    },
  ],
  generateUpdatesFilesForAllChannels: true,
  toolsets: { winCodeSign: '1.1.0' },
  protocols: [{ name: 'Eternal', schemes: ['eternal'] }],
  linux: {
    target: [
      ['AppImage', 'deb', 'rpm', 'flatpak', 'snap'].includes(distribution)
        ? distribution
        : 'AppImage',
    ],
    icon: 'build/icons',
    category: 'Network;InstantMessaging',
    maintainer: 'Eternal contributors <eternalnet.support@proton.me>',
    desktop: { entry: { StartupWMClass: 'eternal' } },
  },
  win: {
    target: [
      distribution === 'msix'
        ? 'appx'
        : ['nsis', 'msi', 'appx'].includes(distribution)
          ? distribution
          : 'nsis',
    ],
    icon: 'build/icon.ico',
  },
  appx: {
    applicationId: 'Eternal',
    displayName: storeRegistration.microsoft.displayName,
    identityName: process.env.ETERNAL_DESKTOP_STORE_IDENTITY ?? 'Eternal.Desktop',
    publisherDisplayName: 'Eternal',
    ...(process.env.ETERNAL_DESKTOP_STORE_PUBLISHER
      ? { publisher: process.env.ETERNAL_DESKTOP_STORE_PUBLISHER }
      : {}),
    ...(distribution === 'msix' ? { artifactName: 'Eternal-${version}-${os}-${arch}.msix' } : {}),
    ...(distribution === 'msix' ? microsoftStoreIdentity(process.env) : {}),
    setBuildNumber: false,
    minVersion: '10.0.17763.0',
    capabilities: ['runFullTrust', 'internetClient', 'webcam', 'microphone'],
  },
  flatpak: {
    runtime: 'org.freedesktop.Platform',
    runtimeVersion: '25.08',
    sdk: 'org.freedesktop.Sdk',
    base: 'org.electronjs.Electron2.BaseApp',
    baseVersion: '25.08',
    finishArgs: [
      '--share=network',
      '--share=ipc',
      '--socket=fallback-x11',
      '--socket=wayland',
      '--socket=pulseaudio',
      '--device=dri',
    ],
  },
  snapcraft: {
    base: 'core24',
    core24: {
      useLXD: true,
      confinement: 'strict',
      grade: 'stable',
      summary: 'Social networking, private messaging and calls',
      stagePackages: ['libxtst6', 'libxt6'],
      plugs: [
        'default',
        { 'browser-support': { interface: 'browser-support', 'allow-sandbox': true } },
        'camera',
        'audio-record',
        'screen-inhibit-control',
      ],
    },
  },
  nsis: {
    include: 'build/installer.nsh',
    oneClick: false,
    perMachine: false,
    allowElevation: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  msi: { perMachine: true },
  asar: true,
  asarUnpack: ['node_modules/uiohook-napi/prebuilds/**'],
  npmRebuild: false,
  directories: { output: 'release', buildResources: 'build' },
  files: ['out/**', 'package.json'],
  electronFuses: {
    runAsNode: false,
    enableCookieEncryption: true,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    resetAdHocDarwinSignature: process.platform === 'darwin',
  },
  mac: {
    x64ArchFiles:
      '**/node_modules/{uiohook-napi/prebuilds/darwin-*,@oxc-parser/binding-darwin-*}/**',
    target: [
      { target: 'dmg', arch: ['universal'] },
      { target: 'zip', arch: ['universal'] },
    ],
    icon: 'build/icon.icns',
    category: 'public.app-category.social-networking',
    ...(!process.env.CSC_LINK ? { identity: '-' } : {}),
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: Boolean(
      process.env.CSC_LINK &&
      process.env.APPLE_ID &&
      process.env.APPLE_APP_SPECIFIC_PASSWORD &&
      process.env.APPLE_TEAM_ID,
    ),
    extendInfo: {
      NSCameraUsageDescription: 'Eternal uses your camera for video calls when you enable it.',
      NSMicrophoneUsageDescription: 'Eternal uses your microphone for voice and video calls.',
      NSScreenCaptureUsageDescription:
        'Eternal records the screen or window you choose to share during a call.',
    },
  },
};

export default config;
