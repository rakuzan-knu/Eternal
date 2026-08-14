/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  branches: ['main', { name: 'develop', prerelease: 'beta', channel: 'beta' }],

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
            { type: 'feat', section: '✨ Features', hidden: false },
            { type: 'fix', section: '🐛 Bug Fixes', hidden: false },
            { type: 'perf', section: '⚡ Performance', hidden: false },
            { type: 'refactor', section: '♻️ Code Refactoring', hidden: false },
            { type: 'chore', section: '🔧 Tooling & Dependencies', hidden: false },
            { type: 'docs', section: '📝 Documentation', hidden: false },
            { type: 'style', section: '💄 Code Style', hidden: false },
            { type: 'test', section: '✅ Tests', hidden: false },
            { type: 'ci', section: '👷 CI/CD & Automation', hidden: false },
            { type: 'revert', section: '⏪ Reverts', hidden: false },
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
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
