/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'chore', 'docs', 'style', 'test', 'perf', 'ci', 'revert'],
    ],
    'scope-enum': [
      1,
      'always',
      ['auth', 'feed', 'chat', 'profile', 'user', 'post', 'follow', 'media', 'ws', 'infra', 'deps', 'security'],
    ],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 200],
  },
  // jira ticket suffix, smth like [SOC-7]
  ignores: [(commit) => commit.startsWith('Merge') || commit.startsWith('Revert')],
};
