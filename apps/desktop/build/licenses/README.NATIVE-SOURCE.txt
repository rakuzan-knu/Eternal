Native library notices and source materials for Eternal Desktop

uiohook-napi 1.5.5 provides the native input hook. Its wrapper is MIT-licensed.
Its native addon statically links libuiohook, which is LGPL-3.0-or-later.
libuiohook's public header carries:
Copyright (C) 2006-2023 Alexander Barker. All Rights Reserved.
The original notices are preserved in the accompanying sources.

COPYING.GPL-3.0.txt and COPYING.LGPL-3.0.txt contain the upstream license texts.
THIRD_PARTY_NOTICES.txt identifies this library and the other supplemental
dependency notices. Eternal-LICENSE.md preserves the required library
modification, replacement, relinking and debugging rights.

uiohook-napi-1.5.5-source.tar.gz contains the files published in npm 1.5.5,
excluding prebuilt native binaries. It includes binding.gyp, the C sources,
headers, wrapper files, package metadata and the wrapper's original MIT LICENSE.
The original npm metadata describes the wrapper as MIT; the native library's
LGPL terms also apply. native-source-manifest.json records the npm integrity,
archive checksum, upstream license provenance and source file checksums.
The archive also includes the GNU license copies and this instruction file,
added for distribution with the original published source files.

Extract the archive into a writable directory. Rebuilding requires Node.js 24,
npm, Python and a C/C++ toolchain: Visual Studio C++ Build Tools on Windows,
Xcode Command Line Tools on macOS, or a compiler/make plus libx11-dev,
libxrandr-dev, libxtst-dev and libxt-dev on Debian/Ubuntu Linux.
From the extracted uiohook-napi-1.5.5 directory run:

  npm exec --yes --package=node-gyp@12.4.0 -- node-gyp rebuild

The result is build/Release/uiohook_napi.node. Build for the application's
processor architecture; cross compilation may need additional SDK components.
The archive's binding.gyp provides the library and wrapper compilation inputs.
No publisher private key is needed to build the native addon.

For a compatible local replacement, close Eternal and retain a backup of the
installed addon. Its location relative to the application's resources is:

  app.asar.unpacked/node_modules/uiohook-napi/prebuilds/<platform>-<arch>/uiohook-napi.node

Place the compatible rebuilt addon at that location and restart. Preserve the
original filenames and architecture. Filesystem permissions and managed package
or operating-system signing policies can require using a writable personal copy
and repackaging it with your own local signing identity. The repository's desktop
packaging scripts are available for this purpose, subject to the limited library
rights in Eternal-LICENSE.md. Refresh the bundled source and checksums when
repackaging a modified library; official-build validation checks that they agree.

The build command and actual replacement must be checked on each intended
platform. These instructions do not claim completed installed-package, Windows
S mode, macOS signing or managed-store replacement testing. The build workflow
separately checks whether the supplied sources can rebuild and load on its host.
