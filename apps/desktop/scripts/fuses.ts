import { join } from 'node:path';
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';
import type { AfterPackContext } from 'electron-builder';

export default async function hardenElectron(context: AfterPackContext): Promise<void> {
  const executable =
    context.electronPlatformName === 'darwin'
      ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
      : join(
          context.appOutDir,
          context.electronPlatformName === 'win32'
            ? `${context.packager.appInfo.productFilename}.exe`
            : (context.packager.config.executableName ??
                context.packager.appInfo.sanitizedName.toLowerCase()),
        );
  await flipFuses(executable, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    resetAdHocDarwinSignature: context.electronPlatformName === 'darwin',
  });
}
