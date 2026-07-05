/** @type {import('semantic-release').GlobalConfig} */
export default {
  branches: [
    'main',
    { name: 'develop', prerelease: 'beta', channel: 'beta' },
  ],

  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'revert', release: 'patch' },
          { type: 'refactor', release: false },
          { type: 'chore', release: false },
          { type: 'docs', release: false },
          { type: 'style', release: false },
          { type: 'test', release: false },
          { type: 'ci', release: false },
          { breaking: true, release: 'major' },
        ],
      },
    ],

    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: '✨ Features' },
            { type: 'fix', section: '🐛 Bug Fixes' },
            { type: 'perf', section: '⚡ Performance' },
            { type: 'revert', section: '⏪ Reverts' },
            { type: 'refactor', section: '♻️ Refactors', hidden: false },
            { type: 'docs', section: '📝 Docs', hidden: true },
            { type: 'chore', hidden: true },
            { type: 'style', hidden: true },
            { type: 'test', hidden: true },
            { type: 'ci', hidden: true },
          ],
        },
      },
    ],

    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle:
          '# Changelog\n\nAll notable changes to this project will be documented in this file.',
      },
    ],

    '@semantic-release/github',

    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
