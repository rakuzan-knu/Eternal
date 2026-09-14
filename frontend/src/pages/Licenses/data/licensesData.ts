export interface PackageAttribution {
  name: string;
  repoUrl: string;
  copyright?: string;
}

export interface LicenseGroup {
  licenseName: string;
  licenseShort: 'MIT' | 'Apache-2.0' | 'BSD' | 'ISC' | 'OFL-1.1';
  officialUrl: string;
  packages: PackageAttribution[];
  licenseText: string;
}

export interface FontAttribution {
  fontName: string;
  author: string;
  websiteUrl: string;
  repoUrl?: string;
  copyright: string;
}

export interface FontsLicenseSection {
  title: string;
  licenseName: string;
  licenseUrl: string;
  fonts: FontAttribution[];
  licenseText: string;
}

export const LICENSES_DATA: LicenseGroup[] = [
  {
    licenseName: 'MIT License',
    licenseShort: 'MIT',
    officialUrl: 'https://opensource.org/licenses/MIT',
    packages: [
      {
        name: 'react',
        repoUrl: 'https://github.com/facebook/react',
        copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
      },
      {
        name: 'react-dom',
        repoUrl: 'https://github.com/facebook/react',
        copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
      },
      {
        name: 'react-router',
        repoUrl: 'https://github.com/remix-run/react-router',
        copyright: 'Copyright (c) Remix Software Inc.',
      },
      {
        name: 'react-router-dom',
        repoUrl: 'https://github.com/remix-run/react-router',
        copyright: 'Copyright (c) Remix Software Inc.',
      },
      {
        name: 'zustand',
        repoUrl: 'https://github.com/pmndrs/zustand',
        copyright: 'Copyright (c) 2019 Paul Henschel',
      },
      {
        name: '@tanstack/react-query',
        repoUrl: 'https://github.com/TanStack/query',
        copyright: 'Copyright (c) 2020 Tanner Linsley',
      },
      {
        name: 'tailwindcss',
        repoUrl: 'https://github.com/tailwindlabs/tailwindcss',
        copyright: 'Copyright (c) Tailwind Labs, Inc.',
      },
      {
        name: '@tailwindcss/vite',
        repoUrl: 'https://github.com/tailwindlabs/tailwindcss',
        copyright: 'Copyright (c) Tailwind Labs, Inc.',
      },
      {
        name: 'react-hook-form',
        repoUrl: 'https://github.com/react-hook-form/react-hook-form',
        copyright: 'Copyright (c) 2019-present Beier Luo',
      },
      {
        name: '@hookform/resolvers',
        repoUrl: 'https://github.com/react-hook-form/resolvers',
        copyright: 'Copyright (c) 2020-present Beier Luo',
      },
      {
        name: 'react-virtuoso',
        repoUrl: 'https://github.com/petyosi/react-virtuoso',
        copyright: 'Copyright (c) 2019 Petyo Ivanov',
      },
      {
        name: 'emoji-picker-react',
        repoUrl: 'https://github.com/ealush/emoji-picker-react',
        copyright: 'Copyright (c) 2019-present Eli Alush',
      },
      {
        name: 'socket.io',
        repoUrl: 'https://github.com/socketio/socket.io',
        copyright: 'Copyright (c) 2014-2024 Automattic <dev@cloudup.com>',
      },
      {
        name: 'socket.io-client',
        repoUrl: 'https://github.com/socketio/socket.io-client',
        copyright: 'Copyright (c) 2014-2024 Automattic <dev@cloudup.com>',
      },
      {
        name: 'multer',
        repoUrl: 'https://github.com/expressjs/multer',
        copyright: 'Copyright (c) 2014 Hage Yaapa',
      },
      {
        name: '@nestjs/core',
        repoUrl: 'https://github.com/nestjs/nest',
        copyright: 'Copyright (c) 2017-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/common',
        repoUrl: 'https://github.com/nestjs/nest',
        copyright: 'Copyright (c) 2017-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/websockets',
        repoUrl: 'https://github.com/nestjs/nest',
        copyright: 'Copyright (c) 2017-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/platform-socket.io',
        repoUrl: 'https://github.com/nestjs/nest',
        copyright: 'Copyright (c) 2017-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/platform-express',
        repoUrl: 'https://github.com/nestjs/nest',
        copyright: 'Copyright (c) 2017-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/jwt',
        repoUrl: 'https://github.com/nestjs/jwt',
        copyright: 'Copyright (c) 2018-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/passport',
        repoUrl: 'https://github.com/nestjs/passport',
        copyright: 'Copyright (c) 2018-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/config',
        repoUrl: 'https://github.com/nestjs/config',
        copyright: 'Copyright (c) 2019-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/throttler',
        repoUrl: 'https://github.com/nestjs/throttler',
        copyright: 'Copyright (c) 2020-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/swagger',
        repoUrl: 'https://github.com/nestjs/swagger',
        copyright: 'Copyright (c) 2018-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/schedule',
        repoUrl: 'https://github.com/nestjs/schedule',
        copyright: 'Copyright (c) 2019-2026 Kamil Mysliwiec',
      },
      {
        name: '@nestjs/event-emitter',
        repoUrl: 'https://github.com/nestjs/event-emitter',
        copyright: 'Copyright (c) 2020-2026 Kamil Mysliwiec',
      },
      {
        name: 'argon2',
        repoUrl: 'https://github.com/ranisalt/node-argon2',
        copyright: 'Copyright (c) 2016-2024 Ranieri Althoff',
      },
      {
        name: 'passport',
        repoUrl: 'https://github.com/jaredhanson/passport',
        copyright: 'Copyright (c) 2011-2024 Jared Hanson',
      },
      {
        name: 'passport-jwt',
        repoUrl: 'https://github.com/mikenicholson/passport-jwt',
        copyright: 'Copyright (c) 2015 Mike Nicholson',
      },
      {
        name: 'helmet',
        repoUrl: 'https://github.com/helmetjs/helmet',
        copyright: 'Copyright (c) 2012-2024 Adam Baldwin, Evan Hahn',
      },
      {
        name: 'sanitize-html',
        repoUrl: 'https://github.com/apostrophecms/sanitize-html',
        copyright: 'Copyright (c) 2013-2024 Apostrophe Technologies, Inc.',
      },
      {
        name: 'zod',
        repoUrl: 'https://github.com/colinhacks/zod',
        copyright: 'Copyright (c) 2020 Colin McDonnell',
      },
      {
        name: 'zod-validation-error',
        repoUrl: 'https://github.com/causaly/zod-validation-error',
        copyright: 'Copyright (c) 2022 Causaly',
      },
      {
        name: 'axios',
        repoUrl: 'https://github.com/axios/axios',
        copyright: 'Copyright (c) 2014-present Matt Zabriskie',
      },
      {
        name: 'nestjs-pino',
        repoUrl: 'https://github.com/iamolegg/nestjs-pino',
        copyright: 'Copyright (c) 2019 Oleg Repin',
      },
      {
        name: 'pino-http',
        repoUrl: 'https://github.com/pinojs/pino-http',
        copyright: 'Copyright (c) 2016-2024 Pino contributors',
      },
      {
        name: 'ua-parser-js',
        repoUrl: 'https://github.com/faisalman/ua-parser-js',
        copyright: 'Copyright (c) 2012-2024 Faisal Salman',
      },
      {
        name: 'uid',
        repoUrl: 'https://github.com/lukeed/uid',
        copyright: 'Copyright (c) Luke Edwards <luke.edwards05@gmail.com>',
      },
      {
        name: 'ioredis',
        repoUrl: 'https://github.com/redis/ioredis',
        copyright: 'Copyright (c) 2015-2024 Zihua Li',
      },
      {
        name: 'bullmq',
        repoUrl: 'https://github.com/taskforcesh/bullmq',
        copyright: 'Copyright (c) 2020-2026 Taskforce.sh Inc.',
      },
      {
        name: 'vite',
        repoUrl: 'https://github.com/vitejs/vite',
        copyright: 'Copyright (c) 2019-present Yuxi (Evan) You and Vite contributors',
      },
      {
        name: 'vitest',
        repoUrl: 'https://github.com/vitest-dev/vitest',
        copyright:
          'Copyright (c) 2021-present Anthony Fu, Matias Capeletto and Vitest contributors',
      },
      {
        name: '@testing-library/react',
        repoUrl: 'https://github.com/testing-library/react-testing-library',
        copyright: 'Copyright (c) 2017 Kent C. Dodds',
      },
      {
        name: '@testing-library/dom',
        repoUrl: 'https://github.com/testing-library/dom-testing-library',
        copyright: 'Copyright (c) 2017 Kent C. Dodds',
      },
      {
        name: '@testing-library/jest-dom',
        repoUrl: 'https://github.com/testing-library/jest-dom',
        copyright: 'Copyright (c) 2017 Kent C. Dodds',
      },
      {
        name: '@testing-library/user-event',
        repoUrl: 'https://github.com/testing-library/user-event',
        copyright: 'Copyright (c) 2018 Giorgio Polvara',
      },
      {
        name: 'jest',
        repoUrl: 'https://github.com/jestjs/jest',
        copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
      },
      {
        name: 'ts-jest',
        repoUrl: 'https://github.com/kulshekhar/ts-jest',
        copyright: 'Copyright (c) 2016-2024 Kulshekhar Kabra',
      },
      {
        name: 'supertest',
        repoUrl: 'https://github.com/ladjs/supertest',
        copyright: 'Copyright (c) 2014 TJ Holowaychuk',
      },
      {
        name: 'eslint',
        repoUrl: 'https://github.com/eslint/eslint',
        copyright: 'Copyright OpenJS Foundation and other contributors <www.openjsf.org>',
      },
      {
        name: 'typescript-eslint',
        repoUrl: 'https://github.com/typescript-eslint/typescript-eslint',
        copyright: 'Copyright (c) TypeScript ESLint contributors',
      },
      {
        name: 'prettier',
        repoUrl: 'https://github.com/prettier/prettier',
        copyright: 'Copyright (c) James Long and contributors',
      },
      {
        name: 'storybook',
        repoUrl: 'https://github.com/storybookjs/storybook',
        copyright: 'Copyright (c) 2016-present Storybook Community',
      },
      {
        name: 'msw',
        repoUrl: 'https://github.com/mswjs/msw',
        copyright: 'Copyright (c) 2019-present Artem Zakharchenko',
      },
      {
        name: '@pact-foundation/pact',
        repoUrl: 'https://github.com/pact-foundation/pact-js',
        copyright: 'Copyright (c) Pact Foundation',
      },
      {
        name: '@sentry/react',
        repoUrl: 'https://github.com/getsentry/sentry-javascript',
        copyright: 'Copyright (c) 2019-present Sentry',
      },
      {
        name: '@sentry/nestjs',
        repoUrl: 'https://github.com/getsentry/sentry-javascript',
        copyright: 'Copyright (c) 2019-present Sentry',
      },
      {
        name: 'esbuild',
        repoUrl: 'https://github.com/evanw/esbuild',
        copyright: 'Copyright (c) 2020 Evan Wallace',
      },
      {
        name: 'jsdom',
        repoUrl: 'https://github.com/jsdom/jsdom',
        copyright: 'Copyright (c) 2010 Elijah Hamovitz',
      },
      {
        name: 'chromatic',
        repoUrl: 'https://github.com/chromaui/chromatic-cli',
        copyright: 'Copyright (c) Chroma Software, Inc.',
      },
      {
        name: 'ts-node',
        repoUrl: 'https://github.com/TypeStrong/ts-node',
        copyright: 'Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)',
      },
      {
        name: 'tsx',
        repoUrl: 'https://github.com/privatenumber/tsx',
        copyright: 'Copyright (c) Hiroki Osame <hiroki.osame@gmail.com>',
      },
    ],
    licenseText: `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  },
  {
    licenseName: 'Apache License 2.0',
    licenseShort: 'Apache-2.0',
    officialUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    packages: [
      {
        name: 'sharp',
        repoUrl: 'https://github.com/lovell/sharp',
        copyright: 'Copyright 2013 Lovell Fuller and others.',
      },
      {
        name: 'prisma',
        repoUrl: 'https://github.com/prisma/prisma',
        copyright: 'Copyright (c) 2018-2026 Prisma Data, Inc.',
      },
      {
        name: '@prisma/client',
        repoUrl: 'https://github.com/prisma/prisma',
        copyright: 'Copyright (c) 2018-2026 Prisma Data, Inc.',
      },
      {
        name: '@aws-sdk/client-s3',
        repoUrl: 'https://github.com/aws/aws-sdk-js-v3',
        copyright: 'Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.',
      },
      {
        name: 'typescript',
        repoUrl: 'https://github.com/microsoft/TypeScript',
        copyright: 'Copyright (c) Microsoft Corporation. All rights reserved.',
      },
      {
        name: '@playwright/test',
        repoUrl: 'https://github.com/microsoft/playwright',
        copyright: 'Copyright (c) Microsoft Corporation. All rights reserved.',
      },
      {
        name: 'rxjs',
        repoUrl: 'https://github.com/ReactiveX/rxjs',
        copyright:
          'Copyright (c) 2015-2024 Google, Inc., Netflix, Inc., Microsoft Corp. and contributors',
      },
      {
        name: 'prom-client',
        repoUrl: 'https://github.com/siimon/prom-client',
        copyright: 'Copyright (c) 2015 Simen Bekkhus',
      },
      {
        name: 'reflect-metadata',
        repoUrl: 'https://github.com/rbuckton/reflect-metadata',
        copyright: 'Copyright (c) Microsoft Corporation. All rights reserved.',
      },
      {
        name: 'geoip-lite',
        repoUrl: 'https://github.com/bluesmoon/node-geoip',
        copyright: 'Copyright 2011-2024 Philip Tellis <philip@bluesmoon.info>',
      },
      {
        name: '@stryker-mutator/core',
        repoUrl: 'https://github.com/stryker-mutator/stryker-js',
        copyright: 'Copyright (c) 2017 Stryker Mutator',
      },
    ],
    licenseText: `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.
"License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.
"Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License.
"Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity.
"You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License.
"Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.
"Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.
"Work" shall mean the work of authorship, whether in Source or Object form, made available under the License.
"Derivative Works" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work.
"Contribution" shall mean any work of authorship that is intentionally submitted to Licensor for inclusion in the Work.
"Contributor" shall mean Licensor and any individual or Legal Entity on behalf of whom a Contribution has been received by Licensor.

2. Grant of Copyright License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work.

4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:
(a) You must give any other recipients of the Work or Derivative Works a copy of this License; and
(b) You must cause any modified files to carry prominent notices stating that You changed the files; and
(c) You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work; and
(d) If the Work includes a "NOTICE" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file.

5. Submission of Contributions. Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions.

6. Trademarks. This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work.

7. Disclaimer of Warranty. Unless required by applicable law or agreed to in writing, Licensor provides the Work (and each Contributor provides its Contributions) on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

8. Limitation of Liability. In no event and under no legal theory shall any Contributor be liable to You for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the Work.

9. Accepting Warranty or Additional Liability. While redistributing the Work or Derivative Works thereof, You may choose to offer, and charge a fee for, acceptance of support, warranty, indemnity, or other liability obligations and/or rights consistent with this License.

END OF TERMS AND CONDITIONS`,
  },
  {
    licenseName: 'ISC License',
    licenseShort: 'ISC',
    officialUrl: 'https://opensource.org/licenses/ISC',
    packages: [
      {
        name: 'lucide-react',
        repoUrl: 'https://github.com/lucide-icons/lucide',
        copyright: 'Copyright (c) Lucide Contributors',
      },
    ],
    licenseText: `Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
  },
  {
    licenseName: 'BSD 2-Clause License',
    licenseShort: 'BSD',
    officialUrl: 'https://opensource.org/licenses/BSD-2-Clause',
    packages: [
      {
        name: 'dotenv',
        repoUrl: 'https://github.com/motdotla/dotenv',
        copyright: 'Copyright (c) 2015, Scott Motte',
      },
    ],
    licenseText: `Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
  },
];

export const FONTS_DATA: FontsLicenseSection = {
  title: 'Fonts',
  licenseName: 'SIL Open Font License, Version 1.1',
  licenseUrl: 'https://openfontlicense.org/',
  fonts: [
    {
      fontName: 'Inter',
      author: 'Rasmus Andersson & The Inter Project Authors',
      websiteUrl: 'https://rsms.me/inter/',
      repoUrl: 'https://github.com/rsms/inter',
      copyright:
        'Copyright (c) 2016-2024 The Inter Project Authors (https://github.com/rsms/inter)',
    },
    {
      fontName: 'Roboto',
      author: 'Christian Robertson & Google',
      websiteUrl: 'https://fonts.google.com/specimen/Roboto',
      repoUrl: 'https://github.com/googlefonts/roboto',
      copyright: 'Copyright 2011 Google Inc. All Rights Reserved.',
    },
    {
      fontName: 'Outfit',
      author: 'Rodrigo Fuenzalida & Outfit',
      websiteUrl: 'https://fonts.google.com/specimen/Outfit',
      repoUrl: 'https://github.com/Outfitio/Outfit-Fonts',
      copyright:
        'Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts)',
    },
    {
      fontName: 'JetBrains Mono',
      author: 'Philipp Nurullin, Konstantin Bulenkov & JetBrains',
      websiteUrl: 'https://www.jetbrains.com/lp/mono/',
      repoUrl: 'https://github.com/JetBrains/JetBrainsMono',
      copyright:
        'Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)',
    },
    {
      fontName: 'Fira Code',
      author: 'Nikita Prokopov',
      websiteUrl: 'https://github.com/tonsky/FiraCode',
      repoUrl: 'https://github.com/tonsky/FiraCode',
      copyright: 'Copyright (c) 2014 Nikita Prokopov',
    },
    {
      fontName: 'Pixelify Sans',
      author: 'Stefanie Vogl',
      websiteUrl: 'https://fonts.google.com/specimen/Pixelify+Sans',
      repoUrl: 'https://github.com/eifetx/Pixelify-Sans',
      copyright:
        'Copyright 2021 The Pixelify Sans Project Authors (https://github.com/eifetx/Pixelify-Sans)',
    },
  ],
  licenseText: `SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide development
of collaborative font projects, to support the font creation efforts of
academic and linguistic communities, and to provide a free and open framework
in which fonts may be shared and improved in partnership with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The fonts,
including any derivative works, can be bundled, embedded, redistributed and/or
sold with any software provided that any reserved names are not used by
derivative works. The fonts and derivatives, however, cannot be released under
any other type of license. The requirement for fonts to remain under this
license does not apply to any document created using the fonts or their
derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright Holder(s)
under this license and clearly marked as such. This can include source files,
build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the copyright
statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting, or
substituting -- in part or in whole -- any of the components of the Original
Version, by changing formats or by porting the Font Software to a new
environment.

"Author" refers to any designer, engineer, programmer, technical writer or
other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining a copy
of the Font Software, to use, study, copy, merge, embed, modify, redistribute,
and sell modified and unmodified copies of the Font Software, subject to the
following conditions:

1) Neither the Font Software nor any of its individual components, in Original
or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy contains
the above copyright notice and this license. These can be included either as
stand-alone text files, human-readable headers or in the appropriate
machine-readable metadata fields within text or binary files as long as those
fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font Name(s)
unless explicit written permission is granted by the corresponding Copyright
Holder. This restriction only applies to the primary font name as presented to
the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote or endorse Modified Versions, except to
acknowledge the contribution(s) of the Copyright Holder(s) and Author(s) or
with their explicit written permission.

5) The Font Software, modified or unmodified, in part or in whole, must be
distributed entirely under this license, and must not be distributed under any
other license. The requirement for fonts to remain under this license does not
apply to any document created using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT,
TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL,
INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE
THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.`,
};
