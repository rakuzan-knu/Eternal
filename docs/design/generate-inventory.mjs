import { access, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { format, resolveConfig } from 'prettier';

// Documentation extraction only: parse source; never import/execute web code.
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const output = resolve(directory, 'web-design-inventory.json');
const normalize = (path) => relative(root, path).replaceAll('\\', '/');
const read = async (path) => (await readFile(path, 'utf8')).replaceAll('\r\n', '\n');
const sort = (items) => items.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

async function filesIn(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directoryPath, entry.name);
      return entry.isDirectory() ? filesIn(path) : [path];
    }),
  );
  return sort(groups.flat());
}

const webFiles = await filesIn(resolve(root, 'apps/web/src'));
const stories = webFiles.filter((path) => /\.stories\.[jt]sx?$/.test(path)).map(normalize);
const sourcePaths = webFiles.filter(
  (path) =>
    /\.(?:[jt]sx?|css|svg)$/.test(path) &&
    !/(?:[\\/](?:__tests__|test|mocks)[\\/]|\.(?:test|spec|stories)\.)/.test(path),
);
sourcePaths.push(
  resolve(root, 'apps/web/index.html'),
  resolve(root, 'apps/web/public/manifest.json'),
  resolve(root, 'apps/web/.storybook/preview.tsx'),
);
sort(sourcePaths);

const presentationNames = new Set([
  'className',
  'style',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'letterSpacing',
  'fill',
  'stroke',
  'strokeWidth',
  'strokeLinecap',
  'strokeLinejoin',
  'opacity',
  'width',
  'height',
  'size',
  'viewBox',
  'rx',
  'ry',
  'r',
  'cx',
  'cy',
  'stopColor',
  'stopOpacity',
  'offset',
  'filter',
  'color',
  'transform',
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileInView',
  'layout',
  'layoutId',
  'drag',
  'dragConstraints',
  'dragElastic',
]);
const catalogNames = new Set([
  'BUBBLE_SHAPE_PRESETS',
  'CHAT_FONTS',
  'CHAT_TEXT_EFFECTS',
  'DISCORD_TEXT_COLORS',
  'DEFAULT_DARK_THEME_CONFIG',
  'BUILT_IN_PRESETS',
  'BUILT_IN_BUBBLE_PRESETS',
  'GRADIENT_PRESETS',
  'COLOR_PALETTE',
  'STORY_FONTS',
  'STORY_ANIMATIONS',
  'LOGO_SVGS',
  'chatThemeSchema',
  'STORY_FILTERS',
  'PROCEDURAL_SHADER_PRESETS',
]);
const sources = [];
const colors = new Map();
const catalogs = [];
for (const path of sourcePaths) {
  const source = await read(path);
  const name = normalize(path);
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
  const lineAt = (offset) => ast.getLineAndCharacterOfPosition(offset).line + 1;
  const presentation = [];
  const utilityLiterals = new Set();
  const colorLiterals = new Set();
  for (const match of source.matchAll(
    /#[\da-fA-F]{8}\b|#[\da-fA-F]{6}\b|#[\da-fA-F]{4}\b|#[\da-fA-F]{3}\b|\b(?:rgba?|hsla?|oklch)\([^\n)]*\)/g,
  )) {
    const value = match[0];
    colorLiterals.add(value);
    if (!colors.has(value)) colors.set(value, new Set());
    colors.get(value).add(`${name}:${lineAt(match.index)}`);
  }
  function visit(node) {
    if (ts.isJsxAttribute(node) && presentationNames.has(node.name.getText(ast))) {
      presentation.push({
        line: lineAt(node.getStart(ast)),
        attribute: node.name.getText(ast),
        expression: node.initializer?.getText(ast) ?? 'true',
      });
    }
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      // Candidate utility strings include helper maps and conditional branches.
      // Dynamic templates are retained as expressions above, not evaluated here.
      const tokens = node.getText(ast).slice(1, -1).split(/\s+/);
      for (const token of tokens) {
        if (
          /^(?:(?:[\w-]+|\[[^\s\]]+\]):)*!?(?:-?(?:bg|text|font|leading|tracking|p[xytrblse]?|m[xytrblse]?|gap|space-[xy]|w|min-w|max-w|h|min-h|max-h|size|rounded|border|ring|shadow|opacity|blur|backdrop|z|top|bottom|left|right|inset|translate|scale|rotate|duration|delay|ease|animate|transition|grid|col|row|flex|items|justify|overflow|object|aspect|cursor|select|scroll|touch|snap|fill|stroke)-[^\s'"`{}]+|hidden|block|inline|inline-block|flex|grid|relative|absolute|fixed|sticky)$/.test(
            token,
          )
        ) {
          utilityLiterals.add(token);
        }
      }
    }
    if (ts.isVariableDeclaration(node) && catalogNames.has(node.name.getText(ast))) {
      catalogs.push({
        source: name,
        line: lineAt(node.getStart(ast)),
        name: node.name.getText(ast),
        expression: node.initializer?.getText(ast) ?? '',
      });
    }
    ts.forEachChild(node, visit);
  }
  if (/\.[jt]sx?$/.test(path)) visit(ast);
  if (
    presentation.length ||
    utilityLiterals.size ||
    colorLiterals.size ||
    /\.(css|svg)$/.test(path)
  ) {
    sources.push({
      path: name,
      utilityLiterals: sort([...utilityLiterals]),
      colorLiterals: sort([...colorLiterals]),
      presentation,
      ...(/\.(css|svg)$/.test(path) ? { stylesheetOrArtwork: source } : {}),
    });
  }
}

const publicFiles = await filesIn(resolve(root, 'apps/web/public'));
const assets = [];
for (const path of publicFiles) {
  if (
    /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|ogg|flac)$/i.test(
      path,
    )
  ) {
    assets.push({
      path: normalize(path),
      extension: extname(path),
      bytes: (await stat(path)).size,
    });
  }
}
const declaredAssets = [];
const html = await read(resolve(root, 'apps/web/index.html'));
const manifest = JSON.parse(await read(resolve(root, 'apps/web/public/manifest.json')));
const declaredPaths = new Set([
  ...[...html.matchAll(/(?:href|src)=["'](\/[^"']+\.(?:svg|ico|png|jpe?g|webp))["']/g)].map(
    (match) => match[1],
  ),
  ...manifest.icons.map((icon) => icon.src),
]);
for (const url of sort([...declaredPaths])) {
  const path = resolve(root, 'apps/web/public', url.replace(/^\//, ''));
  let exists = true;
  try {
    await access(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    exists = false;
  }
  declaredAssets.push({ url, path: normalize(path), exists });
}
const tailwindDirectory = resolve(root, 'apps/web/node_modules/tailwindcss');
const tailwindPackage = JSON.parse(await read(resolve(tailwindDirectory, 'package.json')));
const themeCss = await read(resolve(tailwindDirectory, 'theme.css'));
const variables = Object.fromEntries(
  [...themeCss.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
);
const inventory = {
  schemaVersion: 1,
  scope: 'Runtime web source, index.html, manifest, Storybook preview and local public media',
  limitations: [
    'Syntax/literal extraction, not computed styles or evaluated runtime configurations.',
    'Utility candidates can include examples; inspect source expressions before reuse.',
    'Literal colors include comments/artwork/data; not all are semantic UI tokens.',
    'Remote assets, runtime palettes, inherited browser styles and shader output are not resolved.',
    'Source lines are valid for this snapshot and can shift after edits.',
  ],
  tailwindDefaults: { version: tailwindPackage.version, variables },
  summary: {
    scannedSources: sourcePaths.length,
    designSources: sources.length,
    literalColors: colors.size,
    assets: assets.length,
    stories: stories.length,
  },
  colors: sort([...colors.keys()]).map((value) => ({
    value,
    references: sort([...colors.get(value)]),
  })),
  catalogs,
  sources,
  assets,
  declaredAssets,
  stories,
};
const serialized = await format(`${JSON.stringify(inventory, null, 2)}\n`, {
  ...(await resolveConfig(output)),
  parser: 'json',
});
if (process.argv.includes('--check')) {
  const previous = await read(output);
  if (previous !== serialized) {
    process.exitCode = 1;
    console.error('Design inventory is stale. Run node docs/design/generate-inventory.mjs');
  } else {
    console.log('Design inventory matches web source and installed Tailwind defaults.');
  }
} else {
  await writeFile(output, serialized, 'utf8');
  console.log(JSON.stringify(inventory.summary));
}
