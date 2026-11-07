import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { generateRouteTable } from './route-table.ts';

const config: unknown = JSON.parse(
  await readFile(new URL('../../../vercel.json', import.meta.url), 'utf8'),
);
const output = new URL('../src/main/generated/routeTable.ts', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
await writeFile(output, generateRouteTable(config));
