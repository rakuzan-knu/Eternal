/**
 * Parity: @social-network/text-pipeline core vs legacy safe-regex.util.
 *
 * This spec is the migration safety net for swapping Posts/Comments/Users
 * extraction to TextPipelineService: on this corpus (production-shaped texts
 * incl. Cyrillic, emoji, boundaries, caps) both implementations must return
 * IDENTICAL mention/hashtag values.
 */

import {
  extractHashtags as legacyExtractHashtags,
  extractMentions as legacyExtractMentions,
} from '../../utils/safe-regex.util';
import { extractHashtags, extractMentions } from '@social-network/text-pipeline';

const CORPUS = [
  'Hey @alex и @maria_99, have you seen this? #TypeScript #nestjs #привет',
  'email@example.com is not a mention, but @ok is',
  '@a,@b;@c!@d?@e:@f(@g[@h{<@i',
  'a#b #c #d_e_f #кириллица #mixed123',
  'no tokens here, just text...',
  '',
  '@x',
  '#',
  '@',
  'trailing @user. and #tag, with punctuation!',
  'hi @bob 🎉 #party @user_name.test',
  'UPPER @ALEX #TAG #ТЕГ',
  'dots.. @a..b #c',
  '@verylongusernamethatiswayoverthirtytwocharacterslimit <#',
  `${'#'.repeat(3)} ${'@'.repeat(3)}`,
  'newline\n@nluser\n#nltag\ntab\t@tabuser',
];

describe('text-pipeline parity with legacy scanners', () => {
  it.each(CORPUS)('mentions identical for %j', (text) => {
    expect(extractMentions(text)).toEqual(legacyExtractMentions(text));
  });

  it.each(CORPUS)('hashtags identical for %j', (text) => {
    expect(extractHashtags(text)).toEqual(legacyExtractHashtags(text));
  });

  it('null/undefined behave identically', () => {
    expect(extractMentions(null)).toEqual(legacyExtractMentions(null));
    expect(extractMentions(undefined)).toEqual(legacyExtractMentions(undefined));
    expect(extractHashtags(null)).toEqual(legacyExtractHashtags(null));
    expect(extractHashtags(undefined)).toEqual(legacyExtractHashtags(undefined));
  });
});
