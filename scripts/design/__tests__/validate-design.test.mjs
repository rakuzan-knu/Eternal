import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateMarkdownFile } from '../validate-design.mjs';

test('validates links and headings while ignoring external URLs and fenced examples', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eternal-design-links-'));
  const source = join(directory, 'source.md');
  const target = join(directory, 'target.md');
  try {
    await writeFile(target, '# Guide\n\n## Chat fonts\n\n## Chat fonts\n');
    await writeFile(
      source,
      '[fonts](target.md#chat-fonts)\n[second](target.md#chat-fonts-1)\n[external](https://example.com)\n```md\n[example](absent.md)\n```\n',
    );
    assert.deepEqual(await validateMarkdownFile(source), []);
    await writeFile(source, '[missing](absent.md)\n[heading](target.md#missing)\n');
    const issues = await validateMarkdownFile(source);
    assert.equal(issues.length, 2);
    assert.match(issues[0], /missing link target/);
    assert.match(issues[1], /missing heading/);
  } finally {
    await unlink(source);
    await unlink(target);
    await rmdir(directory);
  }
});
