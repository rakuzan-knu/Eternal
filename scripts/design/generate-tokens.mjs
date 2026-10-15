import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { designTokens } from '../../packages/shared/ui-primitives/src/tokens.ts';

// Node >=24.11 strips the type-only `as const`. Import only inert shared data,
// never web/runtime code. Checked-in CSS is consumed by Tailwind and Storybook.
const output = new URL('../../apps/web/src/shared/design/tokens.css', import.meta.url);
const kebab = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function flatten(value, path = []) {
  return Object.entries(value).flatMap(([key, entry]) => {
    const parts = [...path, key];
    if (typeof entry === 'object') return flatten(entry, parts);
    let unit = String(entry);
    if (typeof entry === 'number') {
      if (
        parts[0] === 'spacing' ||
        parts[0] === 'radius' ||
        parts[1] === 'size' ||
        parts[1] === 'lineHeight'
      ) {
        unit = `${entry / 16}rem`;
      } else if (parts[1] === 'duration') {
        unit = `${entry}ms`;
      } else if (parts[0] === 'web' && key === 'glassBlur') {
        unit = `${entry}px`;
      }
    }
    return `  --eternal-${parts.map(kebab).join('-')}: ${unit};`;
  });
}

const css = await format(
  `/* Generated from shared/ui-primitives/src/tokens.ts. Run node scripts/design/generate-tokens.mjs. */\n:root {\n${flatten(designTokens).join('\n')}\n}\n`,
  { ...(await resolveConfig(fileURLToPath(output))), parser: 'css' },
);
if (process.argv.includes('--check')) {
  const actual = (await readFile(output, 'utf8')).replaceAll('\r\n', '\n');
  if (actual !== css) {
    console.error('Design token CSS is stale. Run node scripts/design/generate-tokens.mjs.');
    process.exitCode = 1;
  }
} else {
  await writeFile(output, css);
}
