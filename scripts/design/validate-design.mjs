import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function headings(source) {
  const counts = new Map();
  return new Set(
    [...source.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => {
      const slug = match[1]
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s/g, '-');
      const count = counts.get(slug) ?? 0;
      counts.set(slug, count + 1);
      return count ? `${slug}-${count}` : slug;
    }),
  );
}

export async function validateMarkdownFile(file) {
  const source = (await readFile(file, 'utf8')).replace(/```[^\n]*\n[\s\S]*?```/g, '');
  const issues = [];
  for (const match of source.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1].replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|app:|codex:)/.test(href)) continue;
    const [path, anchor] = href.split('#');
    const target = path ? resolve(dirname(file), decodeURIComponent(path)) : file;
    try {
      if (anchor && /\.md$/i.test(target)) {
        const targetSource = await readFile(target, 'utf8');
        if (!headings(targetSource).has(decodeURIComponent(anchor)))
          issues.push(`${file}: missing heading ${href}`);
      } else {
        await access(target);
      }
    } catch {
      issues.push(`${file}: missing link target ${href}`);
      continue;
    }
  }
  return issues;
}

async function main() {
  const directory = resolve(root, 'docs/design');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md'));
  const results = await Promise.all(
    files.map((file) => validateMarkdownFile(resolve(directory, file))),
  );
  const issues = results.flat();
  const inventory = JSON.parse(
    await readFile(resolve(directory, 'web-design-inventory.json'), 'utf8'),
  );
  for (const asset of inventory.declaredAssets) {
    try {
      await access(resolve(root, asset.path));
    } catch {
      issues.push(`Missing declared application asset: ${asset.url}`);
    }
  }
  const lockfile = (await readFile(resolve(root, 'pnpm-lock.yaml'), 'utf8')).replaceAll(
    '\r\n',
    '\n',
  );
  const webImporter = lockfile.match(/^  apps\/web:\n([\s\S]*?)(?=^  \S|^packages:)/m)?.[1];
  const tailwindVersion = webImporter?.match(
    /      tailwindcss:\n        specifier: [^\n]+\n        version: ([^\s(]+)/,
  )?.[1];
  if (tailwindVersion !== inventory.tailwindDefaults.version)
    issues.push('Inventory Tailwind version must match the web lockfile importer.');
  if (issues.length) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `Design documentation: ${files.length} guides, local links/headings, declared assets and locked Tailwind version passed.`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
